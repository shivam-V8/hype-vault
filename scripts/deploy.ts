import { JsonRpcProvider, Wallet, ContractFactory, Contract } from "ethers";
import fs from "fs";
import path from "path";
import "dotenv/config";

function loadArtifact(name: string) {
  const artifactPath = path.join(
    process.cwd(),
    "artifacts/contracts",
    `${name}.sol`,
    `${name}.json`
  );
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function main() {
  const rpc = process.env.HYPER_EVM_RPC!;
  const pk = process.env.DEPLOYER_PRIVATE_KEY!;
  const usdc = process.env.USDC_ADDRESS!;
  const botSigner = process.env.BOT_SIGNER!;

  const provider = new JsonRpcProvider(rpc, 998);
  const wallet = new Wallet(pk, provider);

  console.log("Deploying with:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log(
    "Native balance:",
    balance.toString(),
  );

  const VaultArt = loadArtifact("Vault");
  const VaultFactory = new ContractFactory(
    VaultArt.abi,
    VaultArt.bytecode,
    wallet
  );
  const vault = await VaultFactory.deploy(usdc);
  await vault.waitForDeployment();
  console.log("Vault:", await vault.getAddress());

  const RMArt = loadArtifact("RiskManager");
  const RMFactory = new ContractFactory(
    RMArt.abi,
    RMArt.bytecode,
    wallet
  );
  const riskManager = await RMFactory.deploy(await vault.getAddress());
  await riskManager.waitForDeployment();
  const riskManagerContract = new Contract(
    await riskManager.getAddress(),
    RMArt.abi,
    wallet
  );
  
  console.log("RiskManager:", await riskManager.getAddress());

  const AdapterArt = loadArtifact("HyperliquidAdapter");
  const AdapterFactory = new ContractFactory(
    AdapterArt.abi,
    AdapterArt.bytecode,
    wallet
  );
  const adapter = await AdapterFactory.deploy();
  await adapter.waitForDeployment();
  console.log("Adapter:", await adapter.getAddress());

  const ExecArt = loadArtifact("Executor");
  const ExecFactory = new ContractFactory(
    ExecArt.abi,
    ExecArt.bytecode,
    wallet
  );
  const executor = await ExecFactory.deploy(
    await riskManager.getAddress(),
    botSigner,
    await adapter.getAddress()
  );
  await executor.waitForDeployment();
  console.log("Executor:", await executor.getAddress());

  await riskManagerContract.setExecutor(await executor.getAddress());
  console.log("RiskManager executor set to:", await executor.getAddress());

  console.log("DEPLOYMENT COMPLETE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

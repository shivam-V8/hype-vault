import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hyperevm: {
            url: process.env.HYPE_EVM_RPC!,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
            type: "http",
        },
    },
}
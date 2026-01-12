import fetch from "node-fetch";

fetch("https://api.hyperliquid-testnet.xyz/info", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "clearinghouseState",
    user: ""
  })
})
.then(r => r.json())
.then(console.log);

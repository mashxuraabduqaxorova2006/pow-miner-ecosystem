import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MinerToken
  const MinerToken = await hre.ethers.getContractFactory("MinerToken");
  const minerToken = await MinerToken.deploy();
  await minerToken.waitForDeployment();
  const minerTokenAddress = await minerToken.getAddress();
  console.log("MinerToken deployed to:", minerTokenAddress);

  // Deploy Swap
  const Swap = await hre.ethers.getContractFactory("Swap");
  const swap = await Swap.deploy(minerTokenAddress);
  await swap.waitForDeployment();
  const swapAddress = await swap.getAddress();
  console.log("Swap deployed to:", swapAddress);

  // Deploy USD and BTC MockTokens
  const MockToken = await hre.ethers.getContractFactory("MockToken");
  
  const usdToken = await MockToken.deploy("USD Tether", "USDT");
  await usdToken.waitForDeployment();
  const usdAddress = await usdToken.getAddress();
  console.log("USD Token deployed to:", usdAddress);

  const btcToken = await MockToken.deploy("Wrapped Bitcoin", "WBTC");
  await btcToken.waitForDeployment();
  const btcAddress = await btcToken.getAddress();
  console.log("BTC Token deployed to:", btcAddress);

  // Setup Swap contract
  await minerToken.setSwapContract(swapAddress);
  await swap.setAssetToken("USD", usdAddress);
  await swap.setAssetToken("BTC", btcAddress);
  console.log("Swap contract setup complete.");

  // Fund Swap contract
  await deployer.sendTransaction({ to: swapAddress, value: hre.ethers.parseEther("100.0") });
  await usdToken.mint(swapAddress, hre.ethers.parseUnits("1000000", 18));
  await btcToken.mint(swapAddress, hre.ethers.parseUnits("100", 18));
  console.log("Swap contract funded with ETH, USD, and BTC.");

  // Save config
  const config = {
    MinerToken: minerTokenAddress,
    Swap: swapAddress,
    USD: usdAddress,
    BTC: btcAddress
  };

  const frontendDir = path.join(__dirname, "..", "frontend", "src", "contract");
  if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });

  fs.writeFileSync(path.join(frontendDir, "config.json"), JSON.stringify(config, null, 2));

  // Copy ABIs
  const abis = {
    "MinerToken": minerToken,
    "Swap": swap,
    "USD": usdToken,
    "BTC": btcToken
  };

  for (const [name, contract] of Object.entries(abis)) {
    const artifact = hre.artifacts.readArtifactSync(name === "USD" || name === "BTC" ? "MockToken" : name);
    fs.writeFileSync(path.join(frontendDir, `${name}.json`), JSON.stringify(artifact.abi, null, 2));
  }

  console.log("Frontend config and ABIs updated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

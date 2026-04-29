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

  // Set swap contract in MinerToken
  await minerToken.setSwapContract(swapAddress);
  console.log("Swap contract set in MinerToken");

  // Send some ETH to Swap contract for testing
  const tx = await deployer.sendTransaction({
    to: swapAddress,
    value: hre.ethers.parseEther("10.0")
  });
  await tx.wait();
  console.log("Sent 10 ETH to Swap contract");

  // Save the address and ABI to the frontend
  const config = {
    MinerToken: minerTokenAddress,
    Swap: swapAddress,
  };

  const frontendDir = path.join(__dirname, "..", "frontend", "src", "contract");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendDir, "config.json"),
    JSON.stringify(config, null, 2)
  );

  // Copy ABIs
  const minerTokenArtifact = hre.artifacts.readArtifactSync("MinerToken");
  fs.writeFileSync(
    path.join(frontendDir, "MinerToken.json"),
    JSON.stringify(minerTokenArtifact.abi, null, 2)
  );

  const swapArtifact = hre.artifacts.readArtifactSync("Swap");
  fs.writeFileSync(
    path.join(frontendDir, "Swap.json"),
    JSON.stringify(swapArtifact.abi, null, 2)
  );

  console.log("Frontend config and ABIs updated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

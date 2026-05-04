import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const MinerToken = await ethers.getContractFactory("MinerToken");
  const minerToken = await MinerToken.deploy();
  await minerToken.waitForDeployment();
  
  const lh = await minerToken.lastBlockHash();
  const diff = Number(await minerToken.difficulty());
  const account = deployer.address;
  const targetPrefix = '0'.repeat(diff);
  
  console.log("last block hash:", lh);
  console.log("targetPrefix:", targetPrefix);
  console.log("difficulty:", diff);
  
  let nonce = 0;
  let hash = "";
  for(let i=0; i<100000; i++) {
     nonce++;
     hash = ethers.sha256(ethers.solidityPacked(['bytes32', 'address', 'uint256'], [lh, account, BigInt(nonce)]));
     if (hash.substring(2, 2 + diff) === targetPrefix) {
        console.log("Found nonce:", nonce, "hash:", hash);
        break;
     }
  }
  
  console.log("Trying to mint with nonce:", nonce);
  const tx = await minerToken.mint(account, nonce);
  await tx.wait();
  console.log("Mint success!");
}

main().catch(console.error);

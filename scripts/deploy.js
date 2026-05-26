import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const { ethers } = await hre.network.connect();

  const [admin, verifier] = await ethers.getSigners();

  console.log("Deploying with admin:", admin.address);
  console.log("Verifier address:", verifier.address);

  const DonationTracker = await ethers.getContractFactory("DonationTracker");
  const contract = await DonationTracker.deploy(verifier.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("Contract deployed at:", address);

  const frontendDir = path.join(process.cwd(), "frontend");
  const outputPath = path.join(frontendDir, "contract-address.json");

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        address,
        verifier: verifier.address,
      },
      null,
      2
    )
  );

  console.log("Contract address written to frontend/contract-address.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
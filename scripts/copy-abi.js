import fs from "node:fs";
import path from "node:path";

const artifactPath = path.join(
  process.cwd(),
  "artifacts",
  "contracts",
  "DonationTracker.sol",
  "DonationTracker.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const outputPath = path.join(
  process.cwd(),
  "frontend",
  "contract-abi.json"
);

fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2));
console.log("ABI copied to frontend/contract-abi.json");

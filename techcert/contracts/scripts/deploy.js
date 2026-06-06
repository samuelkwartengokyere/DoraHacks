const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const TechCert = await hre.ethers.getContractFactory("TechCert");
  const techCert = await TechCert.deploy(deployer.address);
  await techCert.waitForDeployment();
  const techCertAddress = await techCert.getAddress();
  console.log("TechCert deployed to:", techCertAddress);

  const SoulboundCertificate = await hre.ethers.getContractFactory("SoulboundCertificate");
  const soulbound = await SoulboundCertificate.deploy(deployer.address);
  await soulbound.waitForDeployment();
  const soulboundAddress = await soulbound.getAddress();
  console.log("SoulboundCertificate deployed to:", soulboundAddress);

  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      TechCert: techCertAddress,
      SoulboundCertificate: soulboundAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.join(__dirname, "../../scripts");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment info saved to scripts/deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

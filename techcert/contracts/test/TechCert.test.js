const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TechCert", function () {
  let techCert;
  let owner;
  let other;

  const certData = {
    studentName: "Alice Johnson",
    certificateTitle: "Full Stack Web Development",
    institutionName: "Tech Academy",
    ipfsHash: "QmTestHash123456789",
    certificateHash: "abc123def456sha256hash",
  };

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const TechCert = await ethers.getContractFactory("TechCert");
    techCert = await TechCert.deploy(owner.address);
    await techCert.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await techCert.owner()).to.equal(owner.address);
    });
  });

  describe("Issue Certificate", function () {
    it("Should issue a certificate successfully", async function () {
      await expect(
        techCert.issueCertificate(
          certData.studentName,
          certData.certificateTitle,
          certData.institutionName,
          certData.ipfsHash,
          certData.certificateHash
        )
      )
        .to.emit(techCert, "CertificateIssued")
        .withArgs(certData.certificateHash, certData.studentName, certData.certificateTitle);

      expect(await techCert.certificateExists(certData.certificateHash)).to.be.true;
    });

    it("Should reject duplicate certificate hash", async function () {
      await techCert.issueCertificate(
        certData.studentName,
        certData.certificateTitle,
        certData.institutionName,
        certData.ipfsHash,
        certData.certificateHash
      );

      await expect(
        techCert.issueCertificate(
          "Bob",
          "Course",
          "School",
          "QmOther",
          certData.certificateHash
        )
      ).to.be.revertedWith("TechCert: certificate already exists");
    });

    it("Should reject empty certificate hash", async function () {
      await expect(
        techCert.issueCertificate(
          certData.studentName,
          certData.certificateTitle,
          certData.institutionName,
          certData.ipfsHash,
          ""
        )
      ).to.be.revertedWith("TechCert: empty certificate hash");
    });

    it("Should reject non-owner issuance", async function () {
      await expect(
        techCert.connect(other).issueCertificate(
          certData.studentName,
          certData.certificateTitle,
          certData.institutionName,
          certData.ipfsHash,
          certData.certificateHash
        )
      ).to.be.revertedWithCustomError(techCert, "OwnableUnauthorizedAccount");
    });
  });

  describe("Verify Certificate", function () {
    it("Should return certificate details for valid hash", async function () {
      await techCert.issueCertificate(
        certData.studentName,
        certData.certificateTitle,
        certData.institutionName,
        certData.ipfsHash,
        certData.certificateHash
      );

      const result = await techCert.verifyCertificate(certData.certificateHash);
      expect(result[0]).to.equal(certData.studentName);
      expect(result[1]).to.equal(certData.certificateTitle);
      expect(result[2]).to.equal(certData.institutionName);
      expect(result[3]).to.equal(certData.ipfsHash);
      expect(result[5]).to.be.true;
    });

    it("Should return unverified for unknown hash", async function () {
      const result = await techCert.verifyCertificate("nonexistent");
      expect(result[5]).to.be.false;
    });
  });
});

describe("SoulboundCertificate", function () {
  let soulbound;
  let owner;
  let recipient;
  let other;

  beforeEach(async function () {
    [owner, recipient, other] = await ethers.getSigners();
    const SoulboundCertificate = await ethers.getContractFactory("SoulboundCertificate");
    soulbound = await SoulboundCertificate.deploy(owner.address);
    await soulbound.waitForDeployment();
  });

  it("Should mint a soulbound certificate", async function () {
    const certHash = "hash123";
    const tokenURI = "ipfs://QmMetadata";

    await expect(
      soulbound.mintCertificate(recipient.address, certHash, tokenURI)
    )
      .to.emit(soulbound, "SoulboundCertificateMinted")
      .withArgs(1, recipient.address, certHash, tokenURI);

    expect(await soulbound.ownerOf(1)).to.equal(recipient.address);
    expect(await soulbound.getTokenIdByHash(certHash)).to.equal(1);
  });

  it("Should block transfers between accounts", async function () {
    await soulbound.mintCertificate(recipient.address, "hash456", "ipfs://meta");

    await expect(
      soulbound.connect(recipient).transferFrom(recipient.address, other.address, 1)
    ).to.be.revertedWith("Soulbound: non-transferable token");
  });

  it("Should verify ownership correctly", async function () {
    const certHash = "hash789";
    await soulbound.mintCertificate(recipient.address, certHash, "ipfs://meta2");

    const [owns, tokenId] = await soulbound.verifyOwnership(certHash, recipient.address);
    expect(owns).to.be.true;
    expect(tokenId).to.equal(1);

    const [notOwns] = await soulbound.verifyOwnership(certHash, other.address);
    expect(notOwns).to.be.false;
  });
});

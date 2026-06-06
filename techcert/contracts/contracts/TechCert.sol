// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TechCert
 * @notice Blockchain certificate verification contract for educational institutions
 */
contract TechCert is Ownable {
    struct Certificate {
        string studentName;
        string certificateTitle;
        string institutionName;
        string ipfsHash;
        string certificateHash;
        uint256 issueDate;
        bool exists;
    }

    mapping(string => Certificate) private certificates;

    event CertificateIssued(
        string certificateHash,
        string studentName,
        string certificateTitle
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Issue a new certificate (admin only)
     */
    function issueCertificate(
        string calldata studentName,
        string calldata certificateTitle,
        string calldata institutionName,
        string calldata ipfsHash,
        string calldata certificateHash
    ) external onlyOwner {
        require(bytes(certificateHash).length > 0, "TechCert: empty certificate hash");
        require(!certificates[certificateHash].exists, "TechCert: certificate already exists");
        require(bytes(studentName).length > 0, "TechCert: empty student name");
        require(bytes(certificateTitle).length > 0, "TechCert: empty certificate title");
        require(bytes(institutionName).length > 0, "TechCert: empty institution name");
        require(bytes(ipfsHash).length > 0, "TechCert: empty IPFS hash");

        certificates[certificateHash] = Certificate({
            studentName: studentName,
            certificateTitle: certificateTitle,
            institutionName: institutionName,
            ipfsHash: ipfsHash,
            certificateHash: certificateHash,
            issueDate: block.timestamp,
            exists: true
        });

        emit CertificateIssued(certificateHash, studentName, certificateTitle);
    }

    /**
     * @notice Verify a certificate by its hash
     */
    function verifyCertificate(
        string calldata certificateHash
    )
        external
        view
        returns (
            string memory studentName,
            string memory certificateTitle,
            string memory institutionName,
            string memory ipfsHash,
            uint256 issueDate,
            bool verified
        )
    {
        Certificate storage cert = certificates[certificateHash];
        verified = cert.exists;

        if (!verified) {
            return ("", "", "", "", 0, false);
        }

        return (
            cert.studentName,
            cert.certificateTitle,
            cert.institutionName,
            cert.ipfsHash,
            cert.issueDate,
            true
        );
    }

    /**
     * @notice Check if a certificate exists
     */
    function certificateExists(string calldata certificateHash) external view returns (bool) {
        return certificates[certificateHash].exists;
    }
}

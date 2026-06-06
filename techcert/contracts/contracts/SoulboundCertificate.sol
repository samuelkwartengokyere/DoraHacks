// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoulboundCertificate
 * @notice Non-transferable ERC-721 soulbound certificate NFTs
 */
contract SoulboundCertificate is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    mapping(uint256 => string) private _certificateHashes;
    mapping(string => uint256) private _hashToTokenId;
    mapping(uint256 => bool) private _minted;

    event SoulboundCertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string certificateHash,
        string tokenURI
    );

    constructor(address initialOwner)
        ERC721("TechCert Soulbound Certificate", "TCSBC")
        Ownable(initialOwner)
    {}

    /**
     * @notice Mint a soulbound certificate NFT to a recipient
     */
    function mintCertificate(
        address recipient,
        string calldata certificateHash,
        string calldata metadataURI
    ) external onlyOwner returns (uint256) {
        require(recipient != address(0), "Soulbound: invalid recipient");
        require(bytes(certificateHash).length > 0, "Soulbound: empty certificate hash");
        require(bytes(metadataURI).length > 0, "Soulbound: empty token URI");
        require(_hashToTokenId[certificateHash] == 0, "Soulbound: certificate already minted");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, metadataURI);

        _certificateHashes[tokenId] = certificateHash;
        _hashToTokenId[certificateHash] = tokenId;
        _minted[tokenId] = true;

        emit SoulboundCertificateMinted(tokenId, recipient, certificateHash, metadataURI);

        return tokenId;
    }

    /**
     * @notice Verify NFT ownership for a certificate hash
     */
    function verifyOwnership(
        string calldata certificateHash,
        address claimant
    ) external view returns (bool ownsCertificate, uint256 tokenId) {
        tokenId = _hashToTokenId[certificateHash];
        if (tokenId == 0) {
            return (false, 0);
        }
        ownsCertificate = ownerOf(tokenId) == claimant;
    }

    /**
     * @notice Get token ID for a certificate hash
     */
    function getTokenIdByHash(string calldata certificateHash) external view returns (uint256) {
        return _hashToTokenId[certificateHash];
    }

    /**
     * @notice Get certificate hash for a token ID
     */
    function getCertificateHash(uint256 tokenId) external view returns (string memory) {
        require(_minted[tokenId], "Soulbound: token does not exist");
        return _certificateHashes[tokenId];
    }

    // Soulbound: block all transfers
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: non-transferable token");
        }
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TBHFArtifacts is ERC721, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    Counters.Counter private _initialTokenIds;
    Counters.Counter private _verifiedTokenIds;

    uint256 public uploadFee = 0.001 ether;
    address public treasury;

    enum ArtifactStatus { Pending, Approved, Rejected }

    struct Artifact {
        string ipfsHash;
        address uploader;
        uint256 initialTokenId;
        uint256 verifiedTokenId;
        ArtifactStatus status;
        uint256 uploadedAt;
        string rejectionReason;
    }

    uint256[] public artifactIds;
    Counters.Counter private _artifactIdCounter;

    mapping(uint256 => Artifact) public artifacts;
    mapping(string => uint256) public ipfsHashToArtifactId;
    mapping(uint256 => uint256) public initialTokenToArtifact;
    mapping(uint256 => uint256) public verifiedTokenToArtifact;

    event ArtifactSubmitted(uint256 indexed artifactId, address indexed uploader, string ipfsHash, uint256 initialTokenId);
    event ArtifactApproved(uint256 indexed artifactId, uint256 verifiedTokenId);
    event ArtifactRejected(uint256 indexed artifactId, string reason);
    event ManagerAdded(address indexed manager);
    event ManagerRemoved(address indexed manager);
    event FeeUpdated(uint256 newFee);
    event TreasuryUpdated(address newTreasury);

    constructor(address _treasury) ERC721("TBHF Artifacts", "TBHFA") {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
    }

    function submitArtifact(string memory ipfsHash) external payable returns (uint256) {
        require(msg.value >= uploadFee, "Insufficient upload fee");
        require(bytes(ipfsHash).length > 0, "Empty IPFS hash");
        require(ipfsHashToArtifactId[ipfsHash] == 0, "Artifact already submitted");

        _artifactIdCounter.increment();
        uint256 artifactId = _artifactIdCounter.current();

        uint256 initialTokenId = 1000000 + _initialTokenIds.current();
        _initialTokenIds.increment();
        _safeMint(msg.sender, initialTokenId);

        artifacts[artifactId] = Artifact({
            ipfsHash: ipfsHash,
            uploader: msg.sender,
            initialTokenId: initialTokenId,
            verifiedTokenId: 0,
            status: ArtifactStatus.Pending,
            uploadedAt: block.timestamp,
            rejectionReason: ""
        });

        artifactIds.push(artifactId);
        ipfsHashToArtifactId[ipfsHash] = artifactId;
        initialTokenToArtifact[initialTokenId] = artifactId;

        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Treasury transfer failed");

        emit ArtifactSubmitted(artifactId, msg.sender, ipfsHash, initialTokenId);

        return artifactId;
    }

    function approveArtifact(uint256 artifactId) external onlyRole(MANAGER_ROLE) {
        Artifact storage artifact = artifacts[artifactId];
        require(artifact.uploader != address(0), "Artifact does not exist");
        require(artifact.status == ArtifactStatus.Pending, "Artifact not pending");

        uint256 verifiedTokenId = 2000000 + _verifiedTokenIds.current();
        _verifiedTokenIds.increment();
        _safeMint(artifact.uploader, verifiedTokenId);

        artifact.verifiedTokenId = verifiedTokenId;
        artifact.status = ArtifactStatus.Approved;
        verifiedTokenToArtifact[verifiedTokenId] = artifactId;

        emit ArtifactApproved(artifactId, verifiedTokenId);
    }

    function rejectArtifact(uint256 artifactId, string memory reason) external onlyRole(MANAGER_ROLE) {
        Artifact storage artifact = artifacts[artifactId];
        require(artifact.uploader != address(0), "Artifact does not exist");
        require(artifact.status == ArtifactStatus.Pending, "Artifact not pending");

        artifact.status = ArtifactStatus.Rejected;
        artifact.rejectionReason = reason;

        emit ArtifactRejected(artifactId, reason);
    }

    function getPendingArtifacts() external view returns (uint256[] memory) {
        uint256 pendingCount = 0;

        for (uint256 i = 0; i < artifactIds.length; i++) {
            if (artifacts[artifactIds[i]].status == ArtifactStatus.Pending) {
                pendingCount++;
            }
        }

        uint256[] memory pendingIds = new uint256[](pendingCount);
        uint256 index = 0;

        for (uint256 i = 0; i < artifactIds.length; i++) {
            if (artifacts[artifactIds[i]].status == ArtifactStatus.Pending) {
                pendingIds[index] = artifactIds[i];
                index++;
            }
        }

        return pendingIds;
    }

    function getApprovedArtifacts() external view returns (uint256[] memory) {
        uint256 approvedCount = 0;

        for (uint256 i = 0; i < artifactIds.length; i++) {
            if (artifacts[artifactIds[i]].status == ArtifactStatus.Approved) {
                approvedCount++;
            }
        }

        uint256[] memory approvedIds = new uint256[](approvedCount);
        uint256 index = 0;

        for (uint256 i = 0; i < artifactIds.length; i++) {
            if (artifacts[artifactIds[i]].status == ArtifactStatus.Approved) {
                approvedIds[index] = artifactIds[i];
                index++;
            }
        }

        return approvedIds;
    }

    function getRejectedArtifacts() external view returns (uint256[] memory) {
        uint256 rejectedCount = 0;

        for (uint256 i = 0; i < artifactIds.length; i++) {
            if (artifacts[artifactIds[i]].status == ArtifactStatus.Rejected) {
                rejectedCount++;
            }
        }

        uint256[] memory rejectedIds = new uint256[](rejectedCount);
        uint256 index = 0;

        for (uint256 i = 0; i < artifactIds.length; i++) {
            if (artifacts[artifactIds[i]].status == ArtifactStatus.Rejected) {
                rejectedIds[index] = artifactIds[i];
                index++;
            }
        }

        return rejectedIds;
    }

    function getArtifact(uint256 artifactId) external view returns (
        string memory ipfsHash,
        address uploader,
        uint256 initialTokenId,
        uint256 verifiedTokenId,
        ArtifactStatus status,
        uint256 uploadedAt,
        string memory rejectionReason
    ) {
        Artifact memory artifact = artifacts[artifactId];
        return (
            artifact.ipfsHash,
            artifact.uploader,
            artifact.initialTokenId,
            artifact.verifiedTokenId,
            artifact.status,
            artifact.uploadedAt,
            artifact.rejectionReason
        );
    }

    function getTotalArtifacts() external view returns (uint256) {
        return artifactIds.length;
    }

    function addManager(address manager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, manager);
        emit ManagerAdded(manager);
    }

    function removeManager(address manager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MANAGER_ROLE, manager);
        emit ManagerRemoved(manager);
    }

    function isManager(address account) external view returns (bool) {
        return hasRole(MANAGER_ROLE, account);
    }

    function setUploadFee(uint256 _newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uploadFee = _newFee;
        emit FeeUpdated(_newFee);
    }

    function setTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newTreasury != address(0), "Invalid treasury address");
        treasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        uint256 artifactId = initialTokenToArtifact[tokenId];
        if (artifactId != 0 || (tokenId >= 1000000 && tokenId < 2000000)) {
            Artifact memory artifact = artifacts[artifactId];
            return string(abi.encodePacked("ipfs://", artifact.ipfsHash, "/initial.json"));
        }

        artifactId = verifiedTokenToArtifact[tokenId];
        if (artifactId != 0 || tokenId >= 2000000) {
            Artifact memory artifact = artifacts[artifactId];
            return string(abi.encodePacked("ipfs://", artifact.ipfsHash, "/verified.json"));
        }

        return "";
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

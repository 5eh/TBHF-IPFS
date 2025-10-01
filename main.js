require("dotenv").config({ path: ".env.local" });
const { ethers } = require("ethers");

const CONTRACT_ADDRESS = "0x69f2df237716d86386d38b219e7b1a70b3ed2527";
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

const CONTRACT_ABI = [
  "function submitArtifact(string ipfsHash) external payable returns (uint256)",
  "function approveArtifact(uint256 artifactId) external",
  "function rejectArtifact(uint256 artifactId, string reason) external",
  "function getArtifact(uint256 artifactId) external view returns (string ipfsHash, address uploader, uint256 initialTokenId, uint256 verifiedTokenId, uint8 status, uint256 uploadedAt, string rejectionReason)",
  "function getPendingArtifacts() external view returns (uint256[])",
  "function getApprovedArtifacts() external view returns (uint256[])",
  "function getRejectedArtifacts() external view returns (uint256[])",
  "function getTotalArtifacts() external view returns (uint256)",
  "function addManager(address manager) external",
  "function removeManager(address manager) external",
  "function isManager(address account) external view returns (bool)",
  "function uploadFee() external view returns (uint256)",
  "function treasury() external view returns (address)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "event ArtifactSubmitted(uint256 indexed artifactId, address indexed uploader, string ipfsHash, uint256 initialTokenId)",
  "event ArtifactApproved(uint256 indexed artifactId, uint256 verifiedTokenId)",
  "event ArtifactRejected(uint256 indexed artifactId, string reason)",
];

const STATUS = {
  0: "Pending",
  1: "Approved",
  2: "Rejected",
};

async function runTests() {
  console.log("\n🚀 TBHF Artifacts Contract Test Suite\n");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Network: Sepolia Testnet\n");

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const uploaderWallet = new ethers.Wallet(
    process.env.PRIVATE_TEST_UPLOADER_KEY,
    provider,
  );
  const managerWallet = new ethers.Wallet(
    process.env.PRIVATE_TEST_MANAGER_KEY,
    provider,
  );

  const uploaderContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    uploaderWallet,
  );
  const managerContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    managerWallet,
  );

  console.log("Uploader Address:", uploaderWallet.address);
  console.log("Manager Address:", managerWallet.address);

  const uploaderBalance = await provider.getBalance(uploaderWallet.address);
  const managerBalance = await provider.getBalance(managerWallet.address);
  console.log("Uploader Balance:", ethers.formatEther(uploaderBalance), "ETH");
  console.log("Manager Balance:", ethers.formatEther(managerBalance), "ETH\n");

  let artifactId1, artifactId2, artifactId3;

  try {
    console.log("====== STEP 1: READ CONTRACT STATE =======\n");

    const uploadFee = await uploaderContract.uploadFee();
    const treasury = await uploaderContract.treasury();
    const totalArtifacts = await uploaderContract.getTotalArtifacts();
    const isManagerCheck = await uploaderContract.isManager(
      managerWallet.address,
    );
    const nftBalance = await uploaderContract.balanceOf(uploaderWallet.address);

    console.log("Upload Fee:", ethers.formatEther(uploadFee), "ETH");
    console.log("Treasury Address:", treasury);
    console.log("Total Artifacts:", totalArtifacts.toString());
    console.log("Is Manager:", isManagerCheck);
    console.log("Uploader NFT Balance:", nftBalance.toString());
    console.log("✅ Step 1 Complete\n");

    console.log("====== STEP 2: SUBMIT FIRST ARTIFACT =======\n");

    const ipfsHash1 = "QmTestHash123ABC456DEF789";
    console.log("Submitting artifact with IPFS hash:", ipfsHash1);
    console.log("Paying upload fee:", ethers.formatEther(uploadFee), "ETH");

    const tx1 = await uploaderContract.submitArtifact(ipfsHash1, {
      value: uploadFee,
    });
    console.log("Transaction sent:", tx1.hash);

    const receipt1 = await tx1.wait();
    console.log("Transaction confirmed in block:", receipt1.blockNumber);

    const submitEvent1 = receipt1.logs.find((log) => {
      try {
        const parsed = uploaderContract.interface.parseLog(log);
        return parsed.name === "ArtifactSubmitted";
      } catch {
        return false;
      }
    });

    const parsedEvent1 = uploaderContract.interface.parseLog(submitEvent1);
    artifactId1 = parsedEvent1.args.artifactId;
    const initialTokenId1 = parsedEvent1.args.initialTokenId;

    console.log("Artifact ID:", artifactId1.toString());
    console.log("Initial NFT Token ID:", initialTokenId1.toString());

    const artifact1 = await uploaderContract.getArtifact(artifactId1);
    console.log("\nArtifact Details:");
    console.log("  IPFS Hash:", artifact1.ipfsHash);
    console.log("  Uploader:", artifact1.uploader);
    console.log("  Status:", STATUS[artifact1.status]);
    console.log("  Initial Token ID:", artifact1.initialTokenId.toString());
    console.log("  Verified Token ID:", artifact1.verifiedTokenId.toString());

    const nftOwner = await uploaderContract.ownerOf(initialTokenId1);
    console.log("  Initial NFT Owner:", nftOwner);
    console.log("✅ Step 2 Complete\n");

    console.log("====== STEP 3: SUBMIT SECOND ARTIFACT =======\n");

    const ipfsHash2 = "QmTestHash999XYZ888UVW777";
    console.log("Submitting second artifact:", ipfsHash2);

    const tx2 = await uploaderContract.submitArtifact(ipfsHash2, {
      value: uploadFee,
    });
    console.log("Transaction sent:", tx2.hash);

    const receipt2 = await tx2.wait();
    const submitEvent2 = receipt2.logs.find((log) => {
      try {
        const parsed = uploaderContract.interface.parseLog(log);
        return parsed.name === "ArtifactSubmitted";
      } catch {
        return false;
      }
    });

    const parsedEvent2 = uploaderContract.interface.parseLog(submitEvent2);
    artifactId2 = parsedEvent2.args.artifactId;

    console.log("Artifact ID:", artifactId2.toString());
    console.log(
      "Initial NFT Token ID:",
      parsedEvent2.args.initialTokenId.toString(),
    );
    console.log("✅ Step 3 Complete\n");

    console.log(
      "====== STEP 4: SUBMIT THIRD ARTIFACT (FOR REJECTION TEST) =======\n",
    );

    const ipfsHash3 = "QmTestHashSpam111Rejected222";
    console.log("Submitting third artifact:", ipfsHash3);

    const tx3 = await uploaderContract.submitArtifact(ipfsHash3, {
      value: uploadFee,
    });

    const receipt3 = await tx3.wait();
    const submitEvent3 = receipt3.logs.find((log) => {
      try {
        const parsed = uploaderContract.interface.parseLog(log);
        return parsed.name === "ArtifactSubmitted";
      } catch {
        return false;
      }
    });

    const parsedEvent3 = uploaderContract.interface.parseLog(submitEvent3);
    artifactId3 = parsedEvent3.args.artifactId;

    console.log("Artifact ID:", artifactId3.toString());
    console.log("✅ Step 4 Complete\n");

    console.log("====== STEP 5: CHECK PENDING ARTIFACTS =======\n");

    const pendingArtifacts = await uploaderContract.getPendingArtifacts();
    console.log("Pending Artifacts Count:", pendingArtifacts.length);
    console.log(
      "Pending Artifact IDs:",
      pendingArtifacts.map((id) => id.toString()).join(", "),
    );

    for (const id of pendingArtifacts) {
      const artifact = await uploaderContract.getArtifact(id);
      console.log(
        `  Artifact ${id}: ${artifact.ipfsHash} - Status: ${STATUS[artifact.status]}`,
      );
    }
    console.log("✅ Step 5 Complete\n");

    console.log("====== STEP 6: APPROVE FIRST ARTIFACT =======\n");

    console.log("Manager approving artifact:", artifactId1.toString());

    const approveTx = await managerContract.approveArtifact(artifactId1);
    console.log("Transaction sent:", approveTx.hash);

    const approveReceipt = await approveTx.wait();
    console.log("Transaction confirmed in block:", approveReceipt.blockNumber);

    const approveEvent = approveReceipt.logs.find((log) => {
      try {
        const parsed = managerContract.interface.parseLog(log);
        return parsed.name === "ArtifactApproved";
      } catch {
        return false;
      }
    });

    const parsedApprove = managerContract.interface.parseLog(approveEvent);
    const verifiedTokenId = parsedApprove.args.verifiedTokenId;

    console.log("Verified NFT Token ID:", verifiedTokenId.toString());

    const updatedArtifact = await uploaderContract.getArtifact(artifactId1);
    console.log("\nUpdated Artifact Details:");
    console.log("  Status:", STATUS[updatedArtifact.status]);
    console.log(
      "  Initial Token ID:",
      updatedArtifact.initialTokenId.toString(),
    );
    console.log(
      "  Verified Token ID:",
      updatedArtifact.verifiedTokenId.toString(),
    );

    const verifiedNftOwner = await uploaderContract.ownerOf(verifiedTokenId);
    console.log("  Verified NFT Owner:", verifiedNftOwner);
    console.log("✅ Step 6 Complete\n");

    console.log("====== STEP 7: REJECT THIRD ARTIFACT =======\n");

    const rejectionReason = "Not historically relevant - spam content";
    console.log("Manager rejecting artifact:", artifactId3.toString());
    console.log("Reason:", rejectionReason);

    const rejectTx = await managerContract.rejectArtifact(
      artifactId3,
      rejectionReason,
    );
    console.log("Transaction sent:", rejectTx.hash);

    const rejectReceipt = await rejectTx.wait();
    console.log("Transaction confirmed in block:", rejectReceipt.blockNumber);

    const rejectedArtifact = await uploaderContract.getArtifact(artifactId3);
    console.log("\nRejected Artifact Details:");
    console.log("  Status:", STATUS[rejectedArtifact.status]);
    console.log("  Rejection Reason:", rejectedArtifact.rejectionReason);
    console.log(
      "  Still has Initial NFT:",
      rejectedArtifact.initialTokenId.toString(),
    );
    console.log(
      "  No Verified NFT:",
      rejectedArtifact.verifiedTokenId.toString(),
    );
    console.log("✅ Step 7 Complete\n");

    console.log("====== STEP 8: CHECK ALL ARTIFACT ARRAYS =======\n");

    const pending = await uploaderContract.getPendingArtifacts();
    const approved = await uploaderContract.getApprovedArtifacts();
    const rejected = await uploaderContract.getRejectedArtifacts();

    console.log(
      "Pending Artifacts:",
      pending.map((id) => id.toString()).join(", ") || "None",
    );
    console.log(
      "Approved Artifacts:",
      approved.map((id) => id.toString()).join(", ") || "None",
    );
    console.log(
      "Rejected Artifacts:",
      rejected.map((id) => id.toString()).join(", ") || "None",
    );
    console.log("✅ Step 8 Complete\n");

    console.log("====== STEP 9: CHECK NFT BALANCES =======\n");

    const finalNftBalance = await uploaderContract.balanceOf(
      uploaderWallet.address,
    );
    console.log("Uploader Total NFTs:", finalNftBalance.toString());
    console.log("  3 Initial NFTs (one per submission)");
    console.log("  1 Verified NFT (for approved artifact)");
    console.log("  Expected Total: 4 NFTs");
    console.log("  Actual Total:", finalNftBalance.toString(), "NFTs");
    console.log("✅ Step 9 Complete\n");

    console.log("====== STEP 10: SECURITY TESTS =======\n");

    console.log("Test 10.1: Duplicate IPFS Hash Prevention");
    try {
      await uploaderContract.submitArtifact(ipfsHash1, { value: uploadFee });
      console.log("❌ FAILED: Allowed duplicate submission");
    } catch (error) {
      console.log("✅ PASSED: Duplicate submission blocked");
      console.log("   Error:", error.message.split("(")[0].trim());
    }

    console.log("\nTest 10.2: Insufficient Fee Protection");
    try {
      await uploaderContract.submitArtifact("QmNewHash", {
        value: ethers.parseEther("0.0001"),
      });
      console.log("❌ FAILED: Accepted insufficient fee");
    } catch (error) {
      console.log("✅ PASSED: Insufficient fee rejected");
      console.log("   Error:", error.message.split("(")[0].trim());
    }

    console.log("\nTest 10.3: Non-Manager Cannot Approve");
    try {
      await uploaderContract.approveArtifact(artifactId2);
      console.log("❌ FAILED: Non-manager was able to approve");
    } catch (error) {
      console.log("✅ PASSED: Non-manager approval blocked");
      console.log("   Error:", error.message.split("(")[0].trim());
    }

    console.log("\nTest 10.4: Cannot Approve Already Approved Artifact");
    try {
      await managerContract.approveArtifact(artifactId1);
      console.log("❌ FAILED: Re-approved already approved artifact");
    } catch (error) {
      console.log("✅ PASSED: Double approval blocked");
      console.log("   Error:", error.message.split("(")[0].trim());
    }

    console.log("\nTest 10.5: Cannot Reject Already Rejected Artifact");
    try {
      await managerContract.rejectArtifact(artifactId3, "Another reason");
      console.log("❌ FAILED: Re-rejected already rejected artifact");
    } catch (error) {
      console.log("✅ PASSED: Double rejection blocked");
      console.log("   Error:", error.message.split("(")[0].trim());
    }

    console.log("\nTest 10.6: Empty IPFS Hash Prevention");
    try {
      await uploaderContract.submitArtifact("", { value: uploadFee });
      console.log("❌ FAILED: Accepted empty IPFS hash");
    } catch (error) {
      console.log("✅ PASSED: Empty IPFS hash rejected");
      console.log("   Error:", error.message.split("(")[0].trim());
    }

    console.log("\n✅ Step 10 Complete\n");

    console.log("====== FINAL SUMMARY =======\n");

    const finalTotal = await uploaderContract.getTotalArtifacts();
    const finalPending = await uploaderContract.getPendingArtifacts();
    const finalApproved = await uploaderContract.getApprovedArtifacts();
    const finalRejected = await uploaderContract.getRejectedArtifacts();

    console.log("Total Artifacts Submitted:", finalTotal.toString());
    console.log("Pending:", finalPending.length);
    console.log("Approved:", finalApproved.length);
    console.log("Rejected:", finalRejected.length);
    console.log("\nUploader NFT Holdings:");
    console.log("  Total NFTs:", finalNftBalance.toString());
    console.log("  Initial NFTs: 3");
    console.log("  Verified NFTs: 1");

    const finalUploaderBalance = await provider.getBalance(
      uploaderWallet.address,
    );
    const gasSpent = uploaderBalance - finalUploaderBalance;
    console.log("\nGas & Fees:");
    console.log("  Total Spent:", ethers.formatEther(gasSpent), "ETH");
    console.log(
      "  Upload Fees Paid:",
      ethers.formatEther(uploadFee * BigInt(3)),
      "ETH",
    );

    console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉\n");
  } catch (error) {
    console.error("\n❌ TEST FAILED:\n");
    console.error("Error:", error.message);
    if (error.transaction) {
      console.error("Transaction Hash:", error.transaction.hash);
    }
    process.exit(1);
  }
}

runTests();

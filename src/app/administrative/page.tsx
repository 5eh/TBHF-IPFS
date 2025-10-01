"use client";
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  AlertCircle,
} from "lucide-react";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider, Contract } from "ethers";
import { deployedContracts } from "../context/deployedContracts";
import Image from "next/image";

interface Artifact {
  id: string;
  ipfsHash: string;
  uploader: string;
  initialTokenId: string;
  uploadedAt: string;
}

export default function AdministrativePage() {
  const [pendingArtifacts, setPendingArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && walletProvider && address) {
      checkManagerStatus();
      loadPendingArtifacts();
    }
  }, [mounted, walletProvider, address]);

  const contract = deployedContracts.sepolia.TBHFArtifacts;

  const checkManagerStatus = async () => {
    try {
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const contractInstance = new Contract(
        contract.address,
        contract.abi,
        ethersProvider,
      );
      const managerStatus = await contractInstance.isManager(address);
      setIsManager(managerStatus);
    } catch (error) {
      console.error("Failed to check manager status:", error);
    }
  };

  const loadPendingArtifacts = async () => {
    try {
      setLoading(true);
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const contractInstance = new Contract(
        contract.address,
        contract.abi,
        ethersProvider,
      );

      const pendingIds = await contractInstance.getPendingArtifacts();

      const artifacts = await Promise.all(
        pendingIds.map(async (id: any) => {
          const artifact = await contractInstance.getArtifact(id);
          return {
            id: id.toString(),
            ipfsHash: artifact[0],
            uploader: artifact[1],
            initialTokenId: artifact[2].toString(),
            uploadedAt: new Date(Number(artifact[5]) * 1000).toLocaleString(),
          };
        }),
      );

      setPendingArtifacts(artifacts);
    } catch (error) {
      console.error("Failed to load pending artifacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (artifactId: string) => {
    if (!isManager) {
      alert("You do not have manager permissions");
      return;
    }

    setProcessingId(artifactId);
    try {
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const signer = await ethersProvider.getSigner();
      const contractInstance = new Contract(
        contract.address,
        contract.abi,
        signer,
      );

      const tx = await contractInstance.approveArtifact(artifactId);
      await tx.wait();

      alert(`Artifact #${artifactId} approved! Verified NFT minted.`);
      loadPendingArtifacts();
    } catch (error: any) {
      console.error("Approval failed:", error);
      alert(`Failed to approve: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (artifactId: string) => {
    if (!isManager) {
      alert("You do not have manager permissions");
      return;
    }

    const reason = rejectionReasons[artifactId] || "";
    if (!reason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setProcessingId(artifactId);
    try {
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const signer = await ethersProvider.getSigner();
      const contractInstance = new Contract(
        contract.address,
        contract.abi,
        signer,
      );

      const tx = await contractInstance.rejectArtifact(artifactId, reason);
      await tx.wait();

      alert(`Artifact #${artifactId} rejected.`);
      setRejectionReasons({ ...rejectionReasons, [artifactId]: "" });
      setRejectingId(null);
      loadPendingArtifacts();
    } catch (error: any) {
      console.error("Rejection failed:", error);
      alert(`Failed to reject: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="mx-auto mb-4 w-24 h-24 flex items-center justify-center">
          <Image
            src="/Logo.png"
            alt="Loading"
            width={96}
            height={96}
            className="animate-pulse"
          />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-6 p-12 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10">
          <Shield className="w-20 h-20 text-gray-600 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-3">Authentication Required</h2>
            <p className="text-gray-400 mb-6">
              Connect your wallet to access admin panel
            </p>
          </div>
          <appkit-button />
        </div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-6 p-12 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-3">Access Denied</h2>
            <p className="text-gray-400 mb-2">
              You do not have manager permissions
            </p>
            <p className="text-sm text-gray-500 font-mono">{address}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Pending Review</h2>
          <p className="text-gray-400 text-sm">
            {pendingArtifacts.length} artifact
            {pendingArtifacts.length !== 1 ? "s" : ""} awaiting approval
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="mx-auto mb-4 w-24 h-24 flex items-center justify-center">
              <Image
                src="/Logo.png"
                alt="Loading"
                width={96}
                height={96}
                className="animate-pulse"
              />
            </div>
            <p className="text-gray-400">Loading pending artifacts...</p>
          </div>
        ) : pendingArtifacts.length === 0 ? (
          <div className="text-center py-20 p-12 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              All caught up! No pending artifacts.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingArtifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="p-6 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10"
              >
                <div className="flex gap-6">
                  <div className="w-48 h-48 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10 flex-shrink-0">
                    <img
                      src={`https://gateway.pinata.cloud/ipfs/${artifact.ipfsHash}`}
                      alt={`Artifact ${artifact.id}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold">
                        Artifact #{artifact.id}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        Uploaded {artifact.uploadedAt}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Uploader</p>
                        <p className="text-white font-mono text-xs">
                          {artifact.uploader}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Initial Token ID</p>
                        <p className="text-white font-mono">
                          {artifact.initialTokenId}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400">IPFS Hash</p>
                        <p className="text-white font-mono text-xs break-all">
                          {artifact.ipfsHash}
                        </p>
                      </div>
                    </div>

                    {rejectingId === artifact.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={rejectionReasons[artifact.id] || ""}
                          onChange={(e) =>
                            setRejectionReasons({
                              ...rejectionReasons,
                              [artifact.id]: e.target.value,
                            })
                          }
                          placeholder="Reason for rejection..."
                          className="w-full backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10 text-white p-3 text-sm"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(artifact.id)}
                            disabled={processingId === artifact.id}
                            className="px-4 py-2 bg-red-800 hover:bg-red-700 disabled:bg-gray-800 text-white text-sm flex items-center gap-2 backdrop-blur-xl shadow-lg ring-1 ring-white/10 transition-all"
                          >
                            {processingId === artifact.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Confirm Rejection
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="px-4 py-2 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10 hover:bg-white/10 text-white text-sm transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(artifact.id)}
                          disabled={processingId === artifact.id}
                          className="px-6 py-2 bg-green-800 hover:bg-green-700 disabled:bg-gray-800 text-white flex items-center gap-2 backdrop-blur-xl shadow-lg ring-1 ring-white/10 transition-all"
                        >
                          {processingId === artifact.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(artifact.id)}
                          disabled={processingId !== null}
                          className="px-6 py-2 bg-red-800 hover:bg-red-700 disabled:bg-gray-800 text-white flex items-center gap-2 backdrop-blur-xl shadow-lg ring-1 ring-white/10 transition-all"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

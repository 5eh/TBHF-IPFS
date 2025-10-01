"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider, Contract } from "ethers";
import { deployedContracts } from "../context/deployedContracts";
import Image from "next/image";

const STATUS: { [key: number]: string } = {
  0: "Pending",
  1: "Approved",
  2: "Rejected",
};
const STATUS_COLORS: { [key: number]: string } = {
  0: "text-yellow-400",
  1: "text-green-400",
  2: "text-red-400",
};
const STATUS_ICONS: { [key: number]: typeof Clock } = {
  0: Clock,
  1: CheckCircle2,
  2: XCircle,
};

interface Artifact {
  id: string;
  ipfsHash: string;
  uploader: string;
  initialTokenId: string;
  verifiedTokenId: string;
  status: number;
  uploadedAt: string;
  rejectionReason: string;
}

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [mounted, setMounted] = useState(false);

  const { walletProvider } = useAppKitProvider("eip155");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadArtifacts();
    }
  }, [mounted, filter]);

  const contract = deployedContracts.sepolia.TBHFArtifacts;

  const loadArtifacts = async () => {
    try {
      setLoading(true);

      let provider;
      if (walletProvider) {
        provider = new BrowserProvider(walletProvider as any);
      } else if (typeof window !== "undefined" && (window as any).ethereum) {
        provider = new BrowserProvider((window as any).ethereum);
      } else {
        throw new Error("No provider available");
      }

      const contractInstance = new Contract(
        contract.address,
        contract.abi,
        provider,
      );

      let artifactIds: any[] = [];

      if (filter === "all") {
        const total = await contractInstance.getTotalArtifacts();
        artifactIds = Array.from({ length: Number(total) }, (_, i) => i + 1);
      } else if (filter === "pending") {
        const ids = await contractInstance.getPendingArtifacts();
        artifactIds = ids.map((id: any) => id);
      } else if (filter === "approved") {
        const ids = await contractInstance.getApprovedArtifacts();
        artifactIds = ids.map((id: any) => id);
      } else if (filter === "rejected") {
        const ids = await contractInstance.getRejectedArtifacts();
        artifactIds = ids.map((id: any) => id);
      }

      const artifactDetails = await Promise.all(
        artifactIds.map(async (id) => {
          const artifact = await contractInstance.getArtifact(id);
          return {
            id: id.toString(),
            ipfsHash: artifact[0],
            uploader: artifact[1],
            initialTokenId: artifact[2].toString(),
            verifiedTokenId: artifact[3].toString(),
            status: Number(artifact[4]),
            uploadedAt: new Date(
              Number(artifact[5]) * 1000,
            ).toLocaleDateString(),
            rejectionReason: artifact[6],
          };
        }),
      );

      setArtifacts(artifactDetails);
    } catch (error) {
      console.error("Failed to load artifacts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="w-16 h-16 animate-pulse rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pb-12">
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex mb-8">
            {["all", "approved", "pending", "rejected"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 transition-colors capitalize ${
                  filter === f
                    ? "text-white bg-stone-900 rounded-full"
                    : "text-gray-400 hover:text-white bg-stone-900 rounded-lg"
                }`}
              >
                {f}
              </button>
            ))}
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
              <p className="text-gray-400">Loading artifacts...</p>
            </div>
          ) : artifacts.length === 0 ? (
            <div className="text-center py-20 p-12">
              <p className="text-gray-400 text-lg">No artifacts found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {artifacts.map((artifact) => {
                const StatusIcon = STATUS_ICONS[artifact.status];
                return (
                  <div
                    key={artifact.id}
                    className="overflow-hidden hover:bg-gray-900 transition-colors"
                  >
                    <div className="aspect-square relative">
                      <img
                        src={`https://gateway.pinata.cloud/ipfs/${artifact.ipfsHash}`}
                        alt={`Artifact ${artifact.id}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="absolute top-3 right-3">
                        <div
                          className={`flex items-center gap-2 px-3 py-1 bg-black bg-opacity-80 ${STATUS_COLORS[artifact.status]}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-semibold">
                            {STATUS[artifact.status]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-gray-400 text-xs">
                          Artifact #{artifact.id}
                        </p>
                        <p className="text-white font-medium mt-1 text-sm">
                          {artifact.uploader.slice(0, 6)}...
                          {artifact.uploader.slice(-4)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{artifact.uploadedAt}</span>
                        <span>#{artifact.initialTokenId}</span>
                      </div>

                      {artifact.verifiedTokenId !== "0" && (
                        <div className="flex items-center gap-2 text-xs text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      )}

                      {artifact.rejectionReason && (
                        <div className="text-xs text-red-400 bg-red-950 bg-opacity-30 p-2">
                          {artifact.rejectionReason}
                        </div>
                      )}

                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${artifact.ipfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-gray-400/10 border border-gray-800 hover:bg-gray-400/15 text-gray-300 py-2 text-sm transition-all"
                      >
                        <span>View</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

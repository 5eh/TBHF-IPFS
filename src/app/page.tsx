"use client";
import { useState, useEffect } from "react";
import { Upload, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider, Contract } from "ethers";
import { deployedContracts } from "./context/deployedContracts";
import Image from "next/image";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [ipfsHash, setIpfsHash] = useState("");
  const [artifactId, setArtifactId] = useState("");
  const [initialTokenId, setInitialTokenId] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState("idle");
  const [mounted, setMounted] = useState(false);

  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");

  useEffect(() => {
    setMounted(true);
  }, []);

  const contract = deployedContracts.sepolia.TBHFArtifacts;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !isConnected || !address || !walletProvider) {
      alert("Please connect your wallet first");
      return;
    }

    setUploading(true);

    try {
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const signer = await ethersProvider.getSigner();

      setCurrentStep("signing");
      const message = `I am uploading an artifact to TBHF at ${new Date().toISOString()}`;
      const signature = await signer.signMessage(message);

      setCurrentStep("uploading");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("walletAddress", address);
      formData.append("signature", signature);
      formData.append("message", message);

      const response = await fetch("/api/upload-ipfs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("IPFS upload failed");
      }

      const data = await response.json();
      const uploadedIpfsHash = data.ipfsHash;
      setIpfsHash(uploadedIpfsHash);

      setCurrentStep("minting");
      const contractInstance = new Contract(
        contract.address,
        contract.abi,
        signer,
      );
      const uploadFee = await contractInstance.uploadFee();

      const tx = await contractInstance.submitArtifact(uploadedIpfsHash, {
        value: uploadFee,
      });

      const receipt = await tx.wait();

      const submitEvent = receipt.logs.find((log: unknown) => {
        try {
          const parsed = contractInstance.interface.parseLog(log as any);
          return parsed?.name === "ArtifactSubmitted";
        } catch {
          return false;
        }
      });

      if (submitEvent) {
        const parsedEvent = contractInstance.interface.parseLog({
          topics: (submitEvent as any).topics,
          data: (submitEvent as any).data,
        });
        setArtifactId(parsedEvent?.args.artifactId.toString());
        setInitialTokenId(parsedEvent?.args.initialTokenId.toString());
      }

      setCurrentStep("complete");
      setUploadComplete(true);
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      const err = error as { code?: string; message?: string };
      if (err.code === "ACTION_REJECTED") {
        alert("Transaction rejected. Please try again.");
      } else {
        alert(`Upload failed: ${err.message || "Unknown error"}`);
      }
      setCurrentStep("idle");
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadComplete(false);
    setIpfsHash("");
    setArtifactId("");
    setInitialTokenId("");
    setCurrentStep("idle");
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case "signing":
        return "Sign message to verify ownership...";
      case "uploading":
        return "Uploading to IPFS...";
      case "minting":
        return "Minting your Initial NFT...";
      default:
        return "Processing...";
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {!mounted ? (
          <div className="text-center space-y-6 p-12 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10">
            <div className="mx-auto mb-4 w-24 h-24 flex items-center justify-center">
              <Image
                src="/Logo.png"
                alt="Loading"
                width={96}
                height={96}
                className="animate-pulse"
              />
            </div>
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : !isConnected ? (
          <div className="text-center space-y-6 p-12 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10">
            <Wallet className="w-20 h-20 text-gray-600 mx-auto" />
            <div>
              <h2 className="text-3xl font-bold mb-3">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect to start uploading artifacts
              </p>
            </div>
            <appkit-button />
          </div>
        ) : !uploadComplete ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Upload An Artifact</h2>
              <p className="text-gray-400">Share a piece of Black history</p>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative transition-all backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10 ${dragActive ? "bg-white/10" : ""} ${file ? "p-8" : "p-16"}`}
            >
              <input
                type="file"
                id="fileInput"
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf"
                className="hidden"
                disabled={uploading}
              />

              {!file ? (
                <label
                  htmlFor="fileInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-4"
                >
                  <Upload className="w-16 h-16 text-gray-600" />
                  <div className="text-center">
                    <p className="text-lg text-gray-300 mb-2">
                      Drop file or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, MP4, or PDF
                    </p>
                  </div>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={resetUpload}
                      disabled={uploading}
                      className="text-gray-400 hover:text-white hover:bg-white/5 transition-all ml-4 p-1 rounded"
                    >
                      ✕
                    </button>
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full bg-blue-800 hover:bg-blue-700 disabled:bg-gray-800 text-white py-4 font-semibold flex items-center justify-center space-x-2 backdrop-blur-xl shadow-lg ring-1 ring-white/10 transition-all"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{getStepMessage()}</span>
                      </>
                    ) : (
                      <span>Upload & Mint NFT</span>
                    )}
                  </button>
                  <p className="text-center text-sm text-gray-400">
                    0.001 ETH upload fee
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 p-12 backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
            <h2 className="text-3xl font-bold">Upload Complete</h2>
            <div className="backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10 p-6 text-left space-y-4">
              <div>
                <p className="text-gray-400 text-sm">IPFS Hash</p>
                <p className="text-white font-mono text-sm break-all">
                  {ipfsHash}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Artifact ID</p>
                <p className="text-white font-mono">{artifactId}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Initial NFT</p>
                <p className="text-white font-mono">{initialTokenId}</p>
              </div>
              <p className="text-sm text-gray-400 pt-4">
                Awaiting team review for Verified badge
              </p>

              <a
                href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center backdrop-blur-xl bg-white/5 shadow-lg ring-1 ring-white/10 hover:bg-white/10 text-blue-400 py-3 text-sm transition-all"
              >
                View on IPFS
              </a>
            </div>
            <button
              onClick={resetUpload}
              className="w-full bg-blue-800 hover:bg-blue-700 text-white py-4 font-semibold backdrop-blur-xl shadow-lg ring-1 ring-white/10 transition-all"
            >
              Upload Another
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// app/api/upload-ipfs/route.ts
import { verifyMessage } from "ethers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const walletAddress = formData.get("walletAddress") as string;
    const signature = formData.get("signature") as string;
    const message = formData.get("message") as string;

    if (!file || !walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    try {
      const recoveredAddress = verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 401 },
      );
    }

    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const pinataFormData = new FormData();
    pinataFormData.append("file", file);

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploader: walletAddress,
        uploadedAt: new Date().toISOString(),
      },
    });
    pinataFormData.append("pinataMetadata", metadata);

    const pinataResponse = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
        body: pinataFormData,
      },
    );

    if (!pinataResponse.ok) {
      throw new Error("Pinata upload failed");
    }

    const { IpfsHash } = await pinataResponse.json();

    return NextResponse.json({
      success: true,
      ipfsHash: IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${IpfsHash}`,
    });
  } catch (error) {
    console.error("IPFS upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

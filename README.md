# 🏛️ The Black History Foundation - Artifact Preservation Platform

A decentralized platform for preserving and verifying Black history artifacts using blockchain and IPFS technology.

## ✨ Features

- 📤 Upload historical artifacts (images, videos, PDFs)
- 🔐 Wallet-based authentication (email or crypto)
- 🎨 Dual NFT system (Initial + Verified badges)
- 👥 Manager approval workflow
- 🖼️ Public artifact gallery
- ⛓️ Ethereum Sepolia testnet

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Sepolia ETH for testing

### Installation

```bash
pnpm install
```

Environment Setup
Create .env.local in the root directory:

# Pinata IPFS

```
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

# Sepolia RPC (optional)

```
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

# Contract (already deployed)

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x69f2df237716d86386d38b219e7b1a70b3ed2527
```

# Treasury address

```
NEXT_PUBLIC_TREASURY_ADDRESS=your_wallet_address
```

Run Development Server

```
pnpm dev
```

Open http://localhost:3000

📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Upload page
│   ├── artifacts/            # Gallery page
│   ├── administrative/       # Admin dashboard
│   └── api/upload-ipfs/      # IPFS upload endpoint
├── components/
│   └── Navigation.tsx        # Nav & footer
└── context/
    ├── appkit.tsx           # Wallet config
    └── deployedContracts.ts # Contract ABI
```

🔑 Getting API Keys
Pinata (IPFS Storage)

Sign up at pinata.cloud
Go to API Keys
Create new key with pinFileToIPFS permission
Copy API Key and Secret to .env.local

Sepolia Test ETH
Get free test ETH: sepoliafaucet.com
🛠️ Tech Stack

Next.js 14 (App Router)
TypeScript
Tailwind CSS
Ethers.js v6
Reown AppKit
IPFS (Pinata)
Solidity 0.8.20

📜 Smart Contract
Deployed on Sepolia: 0x69f2df237716d86386d38b219e7b1a70b3ed2527
Features:

Submit artifacts (0.001 ETH fee)
Dual NFT minting
Manager-based approval system
On-chain rejection reasons

🎯 User Flow

Upload: Connect wallet → Upload file → Pay 0.001 ETH → Receive Initial NFT
Review: Managers review submissions
Verify: Approved artifacts receive Verified NFT badge

🔒 Admin Access
To become a manager, the contract owner must call addManager(yourAddress) from the deployer wallet.
📝 License
501(c)(3) Non-Profit Organization
🤝 Contributing
This is a hackathon MVP. For production deployment, contact The Black History Foundation at tbhn.org

Built with ❤️ for preserving history

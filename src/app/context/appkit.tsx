"use client";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { sepolia } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ReactNode } from "react";

const projectId = "08417fba2b959c38cb130ef068554887";

const metadata = {
  name: "TBHF Test App",
  description: "Black History Foundation - Preserve & Share History",
  url: "http://localhost:3000",
  icons: ["https://avatars.mywebsite.com/"],
};

const wagmiAdapter = new WagmiAdapter({
  networks: [sepolia],
  projectId,
});

createAppKit({
  adapters: [wagmiAdapter],
  metadata: metadata,
  networks: [sepolia],
  projectId,
  features: {
    analytics: true,
    email: true,
    socials: ["google", "apple", "discord", "x"],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#1E40AF",
    "--w3m-border-radius-master": "0px",
    "--w3m-color-mix": "#202020",
    "--w3m-color-mix-strength": 10,
  },
});

const queryClient = new QueryClient();

export function AppKit({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

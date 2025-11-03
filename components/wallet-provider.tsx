"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base } from "@reown/appkit/networks";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { projectId, wagmiAdapter } from "@/config";
import { APP_URL } from "@/lib/constants";

// Create a Query Client for React Query
const queryClient = new QueryClient();

// Check for required environment variable
if (!projectId) {
  throw new Error("Project ID is not defined");
}


// App metadata (required for AppKit modal)
const metadata = {
  name: "Farcaster Wallet Example",
  description: "Wallet provider for Farcaster MiniApp",
  url: APP_URL, // should match your deployed miniapp domain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Initialize Reown AppKit (browser wallet modal)
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [base],
  defaultNetwork: base,
  metadata,
  features: {
    analytics: true, // optional
  },
});

// Main Provider
export default function WalletProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies?: string | null;
}) {
  // Initialize Farcaster MiniApp + Wagmi from cookies (session persistence)
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies ?? undefined
  );

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

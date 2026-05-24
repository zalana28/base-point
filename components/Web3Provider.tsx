"use client";

/**
 * Base Point — Web3Provider.
 *
 * Wraps the app in WagmiProvider + QueryClientProvider so the wallet
 * payment path (`<PayWithWalletButton />`) can connect, switch chains,
 * and call `writeContract`.
 *
 * The Base Pay path (`<PayWithBaseButton />`) does NOT depend on this
 * provider — it goes through `lib/basePay.ts` and the @base-org/account
 * SDK.
 *
 * Constraints honoured here:
 *  - Base Sepolia only via `wagmiConfig` (lib/wagmi.ts).
 *  - No balance reads, no transaction-history reads, no explorer or
 *    indexer APIs.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

interface Props {
  children: ReactNode;
}

export function Web3Provider({ children }: Props) {
  // QueryClient lives in `useState` so it's stable across re-renders
  // but unique per real mount (StrictMode dev double-invoke is fine —
  // the lazy initializer only runs once per real mount).
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

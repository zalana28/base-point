"use client";

/**
 * Base Point — `<PayWithWalletButton />`.
 *
 * The wallet payment path: connect a regular EVM wallet (MetaMask,
 * Rabby, Coinbase Wallet, WalletConnect-compatible wallets, etc.),
 * ensure it's on Base Sepolia, and submit a USDC `transfer(...)`
 * directly. Once the transaction is mined, persist a terminal status
 * to the local PaymentStore.
 *
 * The Base Pay path lives in `<PayWithBaseButton />` and uses the
 * @base-org/account SDK via `lib/basePay.ts`. Both buttons can render
 * on the same page; whichever one the customer clicks "wins" and tags
 * the record via `paidVia` so the Receipt labels the id correctly.
 *
 * Constraints honoured here (do not relax):
 *  - No `@base-org/account` import. That SDK lives in lib/basePay.ts.
 *  - No `testnet:` literal — wagmi is pinned to Base Sepolia inside
 *    lib/wagmi.ts.
 *  - No direct `localStorage` access. Goes through `getPaymentStore()`.
 *  - No balance reads. No transaction-history reads. No block-explorer
 *    or third-party indexer APIs.
 */

import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { truncateAddress } from "@/lib/format";
import { CHAIN_ID, NETWORK_NAME } from "@/lib/network";
import {
  USDC_ADDRESS_BASE_SEPOLIA,
  USDC_TRANSFER_ABI,
  toUsdcUnits,
} from "@/lib/usdc";
import { getPaymentStore } from "@/stores/paymentStore";
import type { PaymentRequest } from "@/types/payment";

interface Props {
  payment: PaymentRequest;
  /**
   * Notify the parent page when the local record changes (after the
   * optimistic `processing` write, and again on terminal status). The
   * parent should re-render with the updated record.
   */
  onUpdate: (updated: PaymentRequest) => void;
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (/reject|denied|user/i.test(err.message)) {
      return "Request was rejected.";
    }
    return err.message;
  }
  return fallback;
}

export function PayWithWalletButton({ payment, onUpdate }: Props) {
  const { isConnected, address, chainId } = useAccount();
  const {
    connect,
    connectors,
    isPending: connecting,
    error: connectError,
  } = useConnect();
  const {
    switchChain,
    isPending: switching,
    error: switchError,
  } = useSwitchChain();
  const { writeContractAsync, isPending: submitting } = useWriteContract();

  const [showConnectors, setShowConnectors] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState<
    `0x${string}` | null
  >(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // The receipt query is automatically polled by wagmi via react-query
  // until the transaction is included on-chain.
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: submittedTxHash ?? undefined,
    chainId: CHAIN_ID,
  });

  // Persist terminal status exactly once per submitted hash.
  const persistedHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (!receipt || !submittedTxHash) return;
    if (persistedHashRef.current === submittedTxHash) return;
    persistedHashRef.current = submittedTxHash;

    let cancelled = false;
    (async () => {
      try {
        if (receipt.status === "success") {
          const updated = await getPaymentStore().update(payment.id, {
            status: "completed",
            settledAt: Date.now(),
          });
          if (!cancelled) onUpdate(updated);
        } else {
          const updated = await getPaymentStore().update(payment.id, {
            status: "failed",
            settledAt: Date.now(),
            errorMessage: "Transaction reverted on-chain.",
          });
          if (!cancelled) onUpdate(updated);
        }
      } catch {
        // Storage errors are non-fatal here. The chain has already
        // settled; the user can refresh.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [receipt, submittedTxHash, payment.id, onUpdate]);

  // Hide entirely once the request is settled — the Receipt below
  // already shows the terminal state.
  if (payment.status === "completed") {
    return null;
  }

  // -----------------------------------------------------------------
  // Render: not connected
  // -----------------------------------------------------------------
  if (!isConnected) {
    if (!showConnectors) {
      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowConnectors(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/10"
          >
            <WalletIcon />
            Pay with Wallet
          </button>
          <p className="text-xs text-slate-500">
            Use Pay with Wallet for MetaMask, Rabby, Coinbase Wallet, and
            WalletConnect-compatible wallets.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-300">Choose a wallet:</p>
        <div className="flex flex-wrap gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => {
                setLocalError(null);
                connect({ connector });
              }}
              disabled={connecting}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {connector.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowConnectors(false)}
            className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
        {connectError ? (
          <p className="text-sm text-rose-300">{connectError.message}</p>
        ) : null}
        <p className="text-xs text-slate-500">
          Use Pay with Wallet for MetaMask, Rabby, Coinbase Wallet, and
          WalletConnect-compatible wallets.
        </p>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // Render: connected, wrong chain
  // -----------------------------------------------------------------
  if (chainId !== CHAIN_ID) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          Your wallet is on a different network.
        </p>
        <button
          type="button"
          onClick={() => {
            setLocalError(null);
            switchChain({ chainId: CHAIN_ID });
          }}
          disabled={switching}
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition-colors hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {switching ? "Switching\u2026" : `Switch to ${NETWORK_NAME}`}
        </button>
        {switchError ? (
          <p className="text-sm text-rose-300">{switchError.message}</p>
        ) : null}
      </div>
    );
  }

  // -----------------------------------------------------------------
  // Render: connected on Base Sepolia, ready to pay
  // -----------------------------------------------------------------
  const waitingForReceipt =
    submittedTxHash !== null && (!receipt || receipt.status === undefined);
  const inFlight = submitting || waitingForReceipt;
  const processing = payment.status === "processing";

  let label: string;
  if (inFlight || processing) {
    label = "Confirming\u2026";
  } else if (payment.status === "failed") {
    label = "Pay with Wallet \u00b7 Retry";
  } else {
    label = "Pay with Wallet";
  }

  async function handlePay() {
    setLocalError(null);
    setSubmittedTxHash(null);
    persistedHashRef.current = null;

    try {
      const hash = await writeContractAsync({
        abi: USDC_TRANSFER_ABI,
        address: USDC_ADDRESS_BASE_SEPOLIA,
        functionName: "transfer",
        args: [payment.recipient, toUsdcUnits(payment.amountUsdc)],
        chainId: CHAIN_ID,
      });
      setSubmittedTxHash(hash);

      const updated = await getPaymentStore().update(payment.id, {
        paymentId: hash,
        paidVia: "wallet",
        status: "processing",
        submittedAt: Date.now(),
        errorMessage: undefined,
      });
      onUpdate(updated);
    } catch (err) {
      setLocalError(describeError(err, "Could not send the transaction."));
    }
  }

  return (
    <div className="space-y-3">
      {localError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          {localError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handlePay}
        disabled={inFlight || processing}
        aria-busy={inFlight ? "true" : undefined}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {inFlight || processing ? (
          <span
            className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-slate-100"
            aria-hidden="true"
          />
        ) : (
          <WalletIcon />
        )}
        {label}
      </button>

      <p className="text-xs text-slate-500">
        Connected:{" "}
        <span className="font-mono text-slate-300">
          {address ? truncateAddress(address, 6, 4) : ""}
        </span>
        {" \u00b7 "}
        Use Pay with Wallet for MetaMask, Rabby, Coinbase Wallet, and
        WalletConnect-compatible wallets.
      </p>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

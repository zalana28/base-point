"use client";

/**
 * Base Point — `<PayWithWalletButton />`.
 *
 * The wallet payment path: connect a regular EVM wallet (MetaMask,
 * Rabby, Coinbase Wallet, WalletConnect-compatible wallets, etc.),
 * ensure it's on Base mainnet, and submit a USDC `transfer(...)`
 * directly. Once the transaction is mined, persist a terminal status
 * to the local PaymentStore.
 *
 * The Base Pay path lives in `<PayWithBaseButton />` and uses the
 * @base-org/account SDK via `lib/basePay.ts`. Both buttons can render
 * on the same page; whichever one the customer clicks "wins" and tags
 * the record via `paidVia` so the Receipt labels the id correctly.
 *
 * Builder Code attribution
 * ------------------------
 * The ERC-8021 Builder Code suffix is appended to wallet transaction
 * calldata for Base attribution. Concretely:
 *   1. We `encodeFunctionData` for `transfer(recipient, amount)` to get
 *      the canonical 4-byte selector + abi-encoded args.
 *   2. `appendBuilderCodeSuffix(...)` tacks the ERC-8021 suffix on the
 *      end. USDC's `transfer` ignores trailing bytes per the ABI, so
 *      semantics are unchanged.
 *   3. We submit via `useSendTransaction` so wagmi sends our exact
 *      `data` field — `useWriteContract` would re-encode and strip
 *      the suffix.
 * The Base Pay path is intentionally NOT changed: we only attach the
 * suffix where we control the raw calldata.
 *
 * Failure handling:
 *  - Before submitting, we run `publicClient.simulateContract(...)`
 *    against the connected wallet's address. If the simulation reverts
 *    with "transfer amount exceeds balance" we surface a friendly
 *    "add USDC on Base" message and DO NOT submit anything. We
 *    deliberately simulate the clean `transfer(...)` call (without the
 *    suffix); the suffix bytes are ignored by USDC, so the simulation
 *    outcome is the same and we keep the wagmi-typed simulator path.
 *  - If the transaction is submitted but the receipt comes back with
 *    `status: "reverted"`, we persist `status: "failed"` with a clear
 *    error message so the page never sticks on "Confirming…".
 *  - If `useWaitForTransactionReceipt` errors out (RPC error, timeout),
 *    we treat that as a failure too — same persisted message — rather
 *    than leaving the record in `processing` indefinitely.
 *  - In every failure branch we keep `paymentId` intact so the
 *    Receipt can still show the customer the transaction hash.
 *
 * Constraints honoured here (do not relax):
 *  - No `@base-org/account` import. That SDK lives in lib/basePay.ts.
 *  - No `testnet:` literal — wagmi is pinned to Base mainnet inside
 *    lib/wagmi.ts.
 *  - No direct `localStorage` access. Goes through `getPaymentStore()`.
 *  - No balance reads. No transaction-history reads. No block-explorer
 *    or third-party indexer APIs. (Pre-flight `simulateContract` is a
 *    transaction dry-run, not a balance read — it asks the chain
 *    "would this transfer succeed?" without enumerating the wallet.)
 */

import { useEffect, useRef, useState } from "react";
import { encodeFunctionData } from "viem";
import {
  useAccount,
  useConnect,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";

import { appendBuilderCodeSuffix } from "@/lib/builderCode";
import { truncateAddress } from "@/lib/format";
import { CHAIN_ID, NETWORK_DISPLAY_NAME } from "@/lib/network";
import {
  USDC_ADDRESS_BASE,
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

/** Shared revert / wait-error message, per spec. */
const FAILURE_MESSAGE =
  "Wallet payment failed. Your wallet may not have enough USDC on Base.";

/**
 * Detect "transfer amount exceeds balance" in any of the shapes viem
 * can throw it (top-level message, `shortMessage`, `details`, or a
 * nested `cause`). Returns true when the simulation result clearly
 * means "your USDC balance is too low".
 */
function isInsufficientBalanceError(err: unknown): boolean {
  const visited = new Set<unknown>();
  const probe = /transfer amount exceeds balance/i;

  function walk(node: unknown): boolean {
    if (!node || typeof node !== "object" || visited.has(node)) return false;
    visited.add(node);

    const candidate = node as {
      message?: unknown;
      shortMessage?: unknown;
      details?: unknown;
      cause?: unknown;
    };
    for (const key of ["message", "shortMessage", "details"] as const) {
      const v = candidate[key];
      if (typeof v === "string" && probe.test(v)) return true;
    }
    if (candidate.cause) return walk(candidate.cause);
    return false;
  }

  return walk(err);
}

function describeWriteError(err: unknown, fallback: string): string {
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
  const { sendTransactionAsync, isPending: submitting } = useSendTransaction();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const [showConnectors, setShowConnectors] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState<
    `0x${string}` | null
  >(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // The receipt query is automatically polled by wagmi via react-query
  // until the transaction is included on-chain. We watch BOTH the
  // delivered receipt (which can be `success` or `reverted`) and any
  // hard error from the wait itself, so the UI never sticks at
  // "Confirming…" if something goes wrong.
  const { data: receipt, error: receiptError } = useWaitForTransactionReceipt({
    hash: submittedTxHash ?? undefined,
    chainId: CHAIN_ID,
  });

  // Persist terminal status exactly once per submitted hash.
  const persistedHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (!submittedTxHash) return;
    if (persistedHashRef.current === submittedTxHash) return;

    // Resolved: receipt arrived (success or reverted).
    // Errored:  the wait itself threw before a receipt could be
    //           delivered (RPC outage, timeout, etc.).
    // Either way, we mark this submitted hash as "handled" so we
    // don't double-write.
    if (!receipt && !receiptError) return;
    persistedHashRef.current = submittedTxHash;

    let cancelled = false;
    (async () => {
      try {
        if (receipt && receipt.status === "success") {
          const updated = await getPaymentStore().update(payment.id, {
            status: "completed",
            settledAt: Date.now(),
          });
          if (!cancelled) onUpdate(updated);
        } else {
          // Either receipt.status === "reverted" or the wait itself
          // errored. Persist the same user-friendly failure message
          // either way; the existing `paymentId` is left intact so
          // the Receipt still surfaces the transaction hash.
          const updated = await getPaymentStore().update(payment.id, {
            status: "failed",
            settledAt: Date.now(),
            errorMessage: FAILURE_MESSAGE,
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
  }, [receipt, receiptError, submittedTxHash, payment.id, onUpdate]);

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
          {switching ? "Switching\u2026" : `Switch to ${NETWORK_DISPLAY_NAME}`}
        </button>
        {switchError ? (
          <p className="text-sm text-rose-300">{switchError.message}</p>
        ) : null}
      </div>
    );
  }

  // -----------------------------------------------------------------
  // Render: connected on Base mainnet, ready to pay
  // -----------------------------------------------------------------
  const waitingForReceipt =
    submittedTxHash !== null && !receipt && !receiptError;
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

    // 1. Build the canonical USDC transfer calldata once. We use it
    //    both for the pre-flight simulation (which expects a strictly
    //    abi-encoded call) and as the base for the suffixed calldata
    //    that actually gets submitted.
    const transferData = encodeFunctionData({
      abi: USDC_TRANSFER_ABI,
      functionName: "transfer",
      args: [payment.recipient, toUsdcUnits(payment.amountUsdc)],
    });
    const transferDataWithSuffix = appendBuilderCodeSuffix(transferData);

    // 2. Pre-flight simulate so we can give a clear message for the
    //    most common failure (insufficient USDC) without burning a
    //    real transaction. Simulating the clean transfer is sufficient
    //    here — the trailing suffix bytes are ignored by USDC, so a
    //    successful clean simulation implies the suffixed transaction
    //    will also succeed for the same balance/allowance reasons.
    //    This is a contract dry-run via eth_call, not a balance read.
    if (publicClient && address) {
      try {
        await publicClient.simulateContract({
          abi: USDC_TRANSFER_ABI,
          address: USDC_ADDRESS_BASE,
          functionName: "transfer",
          args: [payment.recipient, toUsdcUnits(payment.amountUsdc)],
          account: address,
        });
      } catch (err) {
        if (isInsufficientBalanceError(err)) {
          setLocalError(
            "Insufficient USDC on Base. Add USDC and try again.",
          );
        } else if (
          err instanceof Error &&
          /reject|denied|user/i.test(err.message)
        ) {
          setLocalError("Request was rejected.");
        } else {
          setLocalError(
            "Could not pre-check the transaction. Please try again.",
          );
        }
        return;
      }
    }

    // 3. Submit the real transaction using the suffixed calldata.
    //    `useSendTransaction` ships our exact `data` bytes; using
    //    `useWriteContract` here would re-encode and strip the suffix.
    let hash: `0x${string}`;
    try {
      hash = await sendTransactionAsync({
        to: USDC_ADDRESS_BASE,
        data: transferDataWithSuffix,
        chainId: CHAIN_ID,
      });
    } catch (err) {
      setLocalError(describeWriteError(err, "Could not send the transaction."));
      return;
    }

    // 4. Optimistic write: record the hash + processing state. The
    //    receipt-handling effect above takes over from here and will
    //    flip the record to `completed` or `failed` once the wait
    //    resolves (or errors).
    setSubmittedTxHash(hash);
    try {
      const updated = await getPaymentStore().update(payment.id, {
        paymentId: hash,
        paidVia: "wallet",
        status: "processing",
        submittedAt: Date.now(),
        errorMessage: undefined,
      });
      onUpdate(updated);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Could not record the payment locally.",
      );
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
        Wallet payments may require Base ETH for gas. Pay with Wallet
        works with MetaMask, Rabby, Coinbase Wallet, and
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

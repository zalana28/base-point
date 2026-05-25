/**
 * Base Point — payment status recovery helpers.
 *
 * Provides utilities to check whether a "processing" payment can be
 * recovered, and to actually recover its on-chain status using only the
 * payment ID / tx hash already stored in localStorage.
 *
 * Rules:
 *  - Only operates on payments with status "processing" AND a known
 *    `paymentId`.
 *  - For Base Pay payments: delegates to `fetchPaymentStatus` in
 *    `lib/basePay.ts` (the only module allowed to touch @base-org/account).
 *  - For wallet payments: uses viem's `getTransactionReceipt` via the
 *    wagmi public client (no external indexer / Etherscan / Basescan).
 *  - Does NOT read balances, transaction history, or any third-party API.
 *  - Does NOT mutate storage — callers are responsible for persisting
 *    the returned updated record via `getPaymentStore().update(...)`.
 */

import { getTransactionReceipt } from "wagmi/actions";

import { fetchPaymentStatus } from "@/lib/basePay";
import { wagmiConfig } from "@/lib/wagmi";
import type { PaymentRequest } from "@/types/payment";

/**
 * Whether a payment is eligible for status recovery.
 *
 * True when:
 *  1. `status` is `"processing"` (the only stuck state).
 *  2. `paymentId` exists (we need something to look up on-chain).
 */
export function canRecoverPayment(payment: PaymentRequest): boolean {
  return payment.status === "processing" && !!payment.paymentId;
}

/**
 * Result of a recovery attempt.
 *
 * Returns the payment with updated fields if a terminal status is
 * found, or the original payment unchanged if still indeterminate.
 */
export async function recoverPaymentStatus(
  payment: PaymentRequest,
): Promise<PaymentRequest> {
  // Short-circuit: only recoverable if processing with a known id.
  if (!canRecoverPayment(payment)) {
    return payment;
  }

  const paymentId = payment.paymentId!;

  if (payment.paidVia === "base-pay") {
    return recoverBasePay(payment, paymentId);
  }

  if (payment.paidVia === "wallet") {
    return recoverWallet(payment, paymentId);
  }

  // Unknown paidVia — can't recover without knowing the path.
  return payment;
}

// ---------- Base Pay recovery -------------------------------------------------

async function recoverBasePay(
  payment: PaymentRequest,
  paymentId: string,
): Promise<PaymentRequest> {
  try {
    const sdkStatus = await fetchPaymentStatus(paymentId);

    // SDK status types: "pending" | "completed" | "failed" | "not_found"
    // Translation (same as the pay page polling logic):
    //   completed -> completed
    //   failed    -> failed
    //   pending / not_found -> still processing (no change)
    if (sdkStatus.status === "completed") {
      return {
        ...payment,
        status: "completed",
        settledAt: Date.now(),
      };
    }

    if (sdkStatus.status === "failed") {
      return {
        ...payment,
        status: "failed",
        errorMessage: "Payment failed on-chain (Base Pay).",
        settledAt: Date.now(),
      };
    }

    // Still pending / not_found — no change.
    return payment;
  } catch {
    // Network error or SDK error — don't crash, just leave unchanged.
    return payment;
  }
}

// ---------- Wallet recovery ---------------------------------------------------

async function recoverWallet(
  payment: PaymentRequest,
  txHash: string,
): Promise<PaymentRequest> {
  try {
    const receipt = await getTransactionReceipt(wagmiConfig, {
      hash: txHash as `0x${string}`,
    });

    if (receipt.status === "success") {
      return {
        ...payment,
        status: "completed",
        settledAt: Date.now(),
      };
    }

    if (receipt.status === "reverted") {
      return {
        ...payment,
        status: "failed",
        errorMessage: "Transaction reverted on-chain.",
        settledAt: Date.now(),
      };
    }

    // Unknown receipt status — leave unchanged.
    return payment;
  } catch {
    // Transaction not yet mined, or RPC error — leave unchanged.
    return payment;
  }
}

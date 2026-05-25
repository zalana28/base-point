/**
 * Base Point — localStorage-backed PaymentStore.
 *
 * MVP-only persistence. SSR-safe: every method short-circuits when there
 * is no `window`, returning an empty value rather than crashing. This
 * lets the file be safely imported from server components.
 *
 * Constraints (do not relax):
 *  - No network calls, no balance reads, no transaction-history reads.
 *  - Does NOT import `@base-org/account` (that lives in lib/basePay.ts).
 *  - `localStorage` is only touched here — pages and components must go
 *    through `PaymentStore` from `stores/paymentStore.ts`.
 *  - Single storage key (see `STORAGE_KEY` below).
 *  - All public methods return Promises so the future Supabase adapter
 *    is a drop-in replacement.
 */

import { newPaymentId } from "@/lib/ids";
import { CHAIN_ID, NETWORK_NAME } from "@/lib/network";
import { generateReceiptId } from "@/lib/receipt";
import type {
  CreatePaymentRequestInput,
  PaymentRequest,
  PaymentRequestStatus,
} from "@/types/payment";

import type { PaymentPatch, PaymentStore } from "./paymentStore";

/**
 * Versioned key so we can ship a migration later without conflicting with
 * existing browser data.
 */
const STORAGE_KEY = "base-point:payments:v1" as const;

// ---------- runtime validators ------------------------------------------------

function isPaymentRequestStatus(v: unknown): v is PaymentRequestStatus {
  return (
    v === "pending" ||
    v === "processing" ||
    v === "completed" ||
    v === "failed"
  );
}

function isAddress(v: unknown): v is `0x${string}` {
  return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
}

/**
 * Type guard used when reading from localStorage. Records that fail this
 * check are silently dropped, which protects the UI from corrupt data
 * (e.g. someone hand-edited localStorage, or a future schema change).
 *
 * Note: `network` and `chainId` are matched strictly against the current
 * MVP constants. If those constants ever change, old records become
 * invisible by design — better than rendering them with the wrong label.
 *
 * Receipt-side fields (`receiptId`, `merchantName`, `itemName`,
 * `quantity`, `unitPriceUsdc`, `customerLabel`, `receiptUrl`) are all
 * optional; if present they are sanity-checked, if absent the record
 * is still considered valid so payments created before the receipt
 * feature shipped continue to round-trip correctly.
 */
function isPaymentRequest(value: unknown): value is PaymentRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  const coreOk =
    typeof v.id === "string" &&
    isAddress(v.recipient) &&
    typeof v.amountUsdc === "string" &&
    typeof v.note === "string" &&
    isPaymentRequestStatus(v.status) &&
    v.network === NETWORK_NAME &&
    v.chainId === CHAIN_ID &&
    typeof v.createdAt === "number";
  if (!coreOk) return false;

  // Optional fields: if present, must be the right shape; if absent, fine.
  if (v.receiptId !== undefined && typeof v.receiptId !== "string") return false;
  if (v.merchantName !== undefined && typeof v.merchantName !== "string")
    return false;
  if (v.itemName !== undefined && typeof v.itemName !== "string") return false;
  if (
    v.quantity !== undefined &&
    (typeof v.quantity !== "number" || !Number.isFinite(v.quantity))
  ) {
    return false;
  }
  if (
    v.unitPriceUsdc !== undefined &&
    typeof v.unitPriceUsdc !== "string"
  ) {
    return false;
  }
  if (
    v.customerLabel !== undefined &&
    typeof v.customerLabel !== "string"
  ) {
    return false;
  }
  if (v.receiptUrl !== undefined && typeof v.receiptUrl !== "string") {
    return false;
  }

  return true;
}

// ---------- raw storage IO ----------------------------------------------------

function readAll(): PaymentRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPaymentRequest);
  } catch {
    // Corrupt JSON, blocked storage, etc. Treat as empty.
    return [];
  }
}

function writeAll(records: PaymentRequest[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Quota exceeded / private-mode restrictions. Nothing useful to do
    // here in the MVP; surfaceable errors land in a follow-up.
  }
}

// ---------- store implementation ----------------------------------------------

export const localPaymentStore: PaymentStore = {
  async list() {
    return readAll().sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id) {
    return readAll().find((r) => r.id === id) ?? null;
  },

  async getByReceiptId(receiptId) {
    if (!receiptId) return null;
    const target = receiptId.toUpperCase();
    return (
      readAll().find(
        (r) => r.receiptId !== undefined && r.receiptId.toUpperCase() === target,
      ) ?? null
    );
  },

  async create(input: CreatePaymentRequestInput) {
    const record: PaymentRequest = {
      id: newPaymentId(),
      receiptId: generateReceiptId(),
      recipient: input.recipient,
      amountUsdc: input.amountUsdc,
      note: input.note,
      status: "pending",
      network: NETWORK_NAME,
      chainId: CHAIN_ID,
      createdAt: Date.now(),
      // Optional itemised fields — only persisted if the form supplied
      // them. We deliberately do NOT default them, so old call sites
      // that only pass {recipient, amountUsdc, note} still work.
      ...(input.merchantName !== undefined && {
        merchantName: input.merchantName,
      }),
      ...(input.itemName !== undefined && { itemName: input.itemName }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.unitPriceUsdc !== undefined && {
        unitPriceUsdc: input.unitPriceUsdc,
      }),
      ...(input.customerLabel !== undefined &&
        input.customerLabel !== "" && { customerLabel: input.customerLabel }),
    };
    const records = readAll();
    records.push(record);
    writeAll(records);
    return record;
  },

  async update(id, patch: PaymentPatch) {
    const records = readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Base Point: payment request not found: ${id}`);
    }
    const existing = records[idx];
    const updated: PaymentRequest = {
      ...existing,
      ...patch,
      // Belt-and-braces: re-pin identity, network metadata, and
      // receipt-side metadata regardless of what the patch tries to
      // do. The PaymentPatch type already blocks these keys; this
      // makes the runtime invariant obvious.
      id: existing.id,
      createdAt: existing.createdAt,
      network: existing.network,
      chainId: existing.chainId,
      receiptId: existing.receiptId,
      merchantName: existing.merchantName,
      itemName: existing.itemName,
      quantity: existing.quantity,
      unitPriceUsdc: existing.unitPriceUsdc,
      customerLabel: existing.customerLabel,
    };
    records[idx] = updated;
    writeAll(records);
    return updated;
  },

  async clear() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Same rationale as writeAll's catch.
    }
  },
};

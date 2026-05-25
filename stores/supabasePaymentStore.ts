/**
 * Base Point — Supabase-backed PaymentStore.
 *
 * Implements the same `PaymentStore` interface as the localStorage
 * adapter, but persists records in Supabase's `payment_requests` table.
 * This enables cross-device checkout: a merchant creates a payment on
 * desktop, and a customer opens the QR /pay/[id] link on their phone.
 *
 * Column naming: the DB uses snake_case; this module translates to/from
 * camelCase PaymentRequest types at the boundary.
 *
 * Constraints (do not relax):
 *  - No auth in this PR (anon key + optional RLS).
 *  - Does NOT import @base-org/account. No Base Pay calls here.
 *  - Does NOT read balances, transaction history, or indexer APIs.
 *  - Does NOT touch localStorage — that stays in localPaymentStore.ts.
 *  - USDC address stays in lib/usdc.ts only.
 */

import { newPaymentId } from "@/lib/ids";
import { CHAIN_ID, NETWORK_NAME } from "@/lib/network";
import { generateReceiptId } from "@/lib/receipt";
import { supabase } from "@/lib/supabaseClient";
import type {
  CreatePaymentRequestInput,
  PaymentRequest,
} from "@/types/payment";

import type { PaymentPatch, PaymentStore } from "./paymentStore";

// ---------- DB row shape (snake_case) -----------------------------------------

interface PaymentRow {
  id: string;
  receipt_id: string | null;
  recipient: string;
  amount_usdc: string;
  note: string;
  status: string;
  payment_id: string | null;
  paid_via: string | null;
  error_message: string | null;
  network: string;
  chain_id: number;
  created_at: string;
  submitted_at: string | null;
  settled_at: string | null;
  merchant_name: string | null;
  item_name: string | null;
  quantity: number | null;
  unit_price_usdc: string | null;
  customer_label: string | null;
  receipt_url: string | null;
}

// ---------- Mappers -----------------------------------------------------------

function rowToPayment(row: PaymentRow): PaymentRequest {
  return {
    id: row.id,
    recipient: row.recipient as `0x${string}`,
    amountUsdc: row.amount_usdc,
    note: row.note,
    status: row.status as PaymentRequest["status"],
    network: row.network as typeof NETWORK_NAME,
    chainId: row.chain_id as typeof CHAIN_ID,
    createdAt: Number(row.created_at),
    ...(row.receipt_id != null && { receiptId: row.receipt_id }),
    ...(row.payment_id != null && { paymentId: row.payment_id }),
    ...(row.paid_via != null && {
      paidVia: row.paid_via as PaymentRequest["paidVia"],
    }),
    ...(row.error_message != null && { errorMessage: row.error_message }),
    ...(row.submitted_at != null && { submittedAt: Number(row.submitted_at) }),
    ...(row.settled_at != null && { settledAt: Number(row.settled_at) }),
    ...(row.merchant_name != null && { merchantName: row.merchant_name }),
    ...(row.item_name != null && { itemName: row.item_name }),
    ...(row.quantity != null && { quantity: row.quantity }),
    ...(row.unit_price_usdc != null && { unitPriceUsdc: row.unit_price_usdc }),
    ...(row.customer_label != null && { customerLabel: row.customer_label }),
    ...(row.receipt_url != null && { receiptUrl: row.receipt_url }),
  };
}

function paymentToRow(payment: PaymentRequest): PaymentRow {
  return {
    id: payment.id,
    receipt_id: payment.receiptId ?? null,
    recipient: payment.recipient,
    amount_usdc: payment.amountUsdc,
    note: payment.note,
    status: payment.status,
    payment_id: payment.paymentId ?? null,
    paid_via: payment.paidVia ?? null,
    error_message: payment.errorMessage ?? null,
    network: payment.network,
    chain_id: payment.chainId,
    created_at: String(payment.createdAt),
    submitted_at: payment.submittedAt != null ? String(payment.submittedAt) : null,
    settled_at: payment.settledAt != null ? String(payment.settledAt) : null,
    merchant_name: payment.merchantName ?? null,
    item_name: payment.itemName ?? null,
    quantity: payment.quantity ?? null,
    unit_price_usdc: payment.unitPriceUsdc ?? null,
    customer_label: payment.customerLabel ?? null,
    receipt_url: payment.receiptUrl ?? null,
  };
}

function patchToRow(
  patch: PaymentPatch,
): Partial<PaymentRow> {
  const row: Partial<PaymentRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.paymentId !== undefined) row.payment_id = patch.paymentId ?? null;
  if (patch.paidVia !== undefined) row.paid_via = patch.paidVia ?? null;
  if (patch.errorMessage !== undefined)
    row.error_message = patch.errorMessage ?? null;
  if (patch.submittedAt !== undefined)
    row.submitted_at = patch.submittedAt != null ? String(patch.submittedAt) : null;
  if (patch.settledAt !== undefined)
    row.settled_at = patch.settledAt != null ? String(patch.settledAt) : null;
  if (patch.receiptUrl !== undefined)
    row.receipt_url = patch.receiptUrl ?? null;
  // recipient and amountUsdc are technically patchable per PaymentPatch
  // type, though in practice only status-related fields get patched.
  if (patch.recipient !== undefined) row.recipient = patch.recipient;
  if (patch.amountUsdc !== undefined) row.amount_usdc = patch.amountUsdc;
  if (patch.note !== undefined) row.note = patch.note;
  return row;
}

// ---------- Store implementation ----------------------------------------------

export const supabasePaymentStore: PaymentStore = {
  async list() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Supabase list error: ${error.message}`);
    return (data as PaymentRow[]).map(rowToPayment);
  },

  async getById(id) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Supabase getById error: ${error.message}`);
    return data ? rowToPayment(data as PaymentRow) : null;
  },

  async getByReceiptId(receiptId) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("payment_requests")
      .select("*")
      .ilike("receipt_id", receiptId)
      .maybeSingle();
    if (error)
      throw new Error(`Supabase getByReceiptId error: ${error.message}`);
    return data ? rowToPayment(data as PaymentRow) : null;
  },

  async create(input: CreatePaymentRequestInput) {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Cannot create shareable payment.",
      );
    }

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

    const row = paymentToRow(record);
    const { data, error } = await supabase
      .from("payment_requests")
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase create error: ${error.message}`);
    }

    return rowToPayment(data as PaymentRow);
  },

  async update(id, patch: PaymentPatch) {
    if (!supabase) {
      throw new Error("Supabase is not configured. Cannot update payment.");
    }

    const rowPatch = patchToRow(patch);
    const { data, error } = await supabase
      .from("payment_requests")
      .update(rowPatch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase update error: ${error.message}`);
    }

    return rowToPayment(data as PaymentRow);
  },

  async clear() {
    // Safety: do not wipe the remote table. No-op for Supabase store.
    // Use the Supabase dashboard to manage data manually.
  },
};

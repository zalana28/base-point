"use client";

/**
 * Base Point — `<PaymentForm />`.
 *
 * Client Component because we own the form state, run inline validation,
 * and call the (browser-side) `PaymentStore`. Renders nothing async at
 * import time, so it is safe to be referenced from a Server Component.
 *
 * Itemised flow
 * -------------
 * The form is itemised by default: merchant + item + quantity +
 * unit price -> `amountUsdc = quantity * unitPriceUsdc`. Quantity is
 * a positive integer in the MVP, which keeps the total math float-free
 * (we use viem's `parseUnits` / `formatUnits` for the multiplication).
 *
 * The single-line "donation" case is still natural: set quantity to 1
 * and unit price to the donation amount.
 *
 * Constraints honoured here (do not relax):
 *  - No Base Pay calls. Base Pay is invoked by the public payment page,
 *    not from `/create`.
 *  - No `@base-org/account` import — that lives in `lib/basePay.ts`.
 *  - No direct `localStorage` access — go through `getPaymentStore()`.
 *  - No balance reads, no transaction-history reads, no block-explorer
 *    or third-party indexer.
 *
 * Creating a payment request is purely offchain (a write to
 * `localStorage`); it does NOT broadcast any transaction and does NOT
 * require gas. Customer-side payment is what consumes USDC and (for
 * the wallet path) Base ETH for gas.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";

import { formatAmount } from "@/lib/format";
import {
  CUSTOMER_LABEL_MAX_LENGTH,
  ITEM_NAME_MAX_LENGTH,
  MERCHANT_NAME_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  validateAddress,
  validateAmount,
  validateCustomerLabel,
  validateItemName,
  validateMerchantName,
  validateNote,
  validateQuantity,
} from "@/lib/validators";
import { getPaymentStore } from "@/stores/paymentStore";

interface FieldErrors {
  merchantName?: string;
  recipient?: string;
  itemName?: string;
  quantity?: string;
  unitPrice?: string;
  customerLabel?: string;
  note?: string;
  /** Top-level error (e.g. storage failure) not tied to a single field. */
  form?: string;
}

const INPUT_BASE =
  "block w-full rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 transition focus:border-blue-400/50 focus:bg-slate-950/70 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

/**
 * Compute the total `amountUsdc` from a (possibly invalid) unit price
 * and quantity, returning `null` if either is currently empty / not a
 * valid USDC decimal / not a valid positive integer. We use viem so
 * the multiplication is integer-domain bigint math, never `Number`.
 */
function computeTotal(unitPrice: string, quantity: string): string | null {
  const trimmedPrice = unitPrice.trim();
  const trimmedQty = quantity.trim();
  if (!trimmedPrice || !trimmedQty) return null;
  if (!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(trimmedPrice)) return null;
  if (!/^[1-9]\d*$/.test(trimmedQty)) return null;
  try {
    const totalUnits = parseUnits(trimmedPrice, 6) * BigInt(trimmedQty);
    return formatUnits(totalUnits, 6);
  } catch {
    return null;
  }
}

export function PaymentForm() {
  const router = useRouter();

  const [merchantName, setMerchantName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => computeTotal(unitPrice, quantity),
    [unitPrice, quantity],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const m = validateMerchantName(merchantName);
    const r = validateAddress(recipient);
    const it = validateItemName(itemName);
    const q = validateQuantity(quantity);
    const up = validateAmount(unitPrice);
    const cl = validateCustomerLabel(customerLabel);
    const n = validateNote(note);

    const nextErrors: FieldErrors = {};
    if (!m.ok) nextErrors.merchantName = m.message;
    if (!r.ok) nextErrors.recipient = r.message;
    if (!it.ok) nextErrors.itemName = it.message;
    if (!q.ok) nextErrors.quantity = q.message;
    if (!up.ok) nextErrors.unitPrice = up.message;
    if (!cl.ok) nextErrors.customerLabel = cl.message;
    if (!n.ok) nextErrors.note = n.message;

    if (
      !m.ok ||
      !r.ok ||
      !it.ok ||
      !q.ok ||
      !up.ok ||
      !cl.ok ||
      !n.ok
    ) {
      setErrors(nextErrors);
      return;
    }

    // Compute the final total once all fields are validated. If for any
    // reason the integer-bigint math fails (it shouldn't here), surface
    // a form-level error rather than silently submitting a wrong total.
    const totalAmount = computeTotal(up.value, String(q.value));
    if (totalAmount === null) {
      setErrors({
        form: "Could not compute the total. Check the quantity and unit price.",
      });
      return;
    }
    const totalChecked = validateAmount(totalAmount);
    if (!totalChecked.ok) {
      setErrors({ form: totalChecked.message });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const record = await getPaymentStore().create({
        recipient: r.value,
        amountUsdc: totalChecked.value,
        note: n.value,
        merchantName: m.value,
        itemName: it.value,
        quantity: q.value,
        unitPriceUsdc: up.value,
        customerLabel: cl.value,
      });
      router.push(`/pay/${record.id}`);
      // Intentionally do NOT clear `submitting` on success — we are
      // navigating away, and re-enabling the button briefly causes a
      // visual flash.
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create payment. Please try again.";
      setErrors({ form: message });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Merchant name -------------------------------------------------- */}
      <div>
        <label
          htmlFor="merchantName"
          className="block text-sm font-medium text-slate-200"
        >
          Merchant name
        </label>
        <input
          id="merchantName"
          name="merchantName"
          type="text"
          autoComplete="organization"
          maxLength={MERCHANT_NAME_MAX_LENGTH}
          placeholder="Acme Coffee"
          value={merchantName}
          onChange={(event) => setMerchantName(event.target.value)}
          aria-invalid={errors.merchantName ? "true" : undefined}
          aria-describedby={
            errors.merchantName ? "merchantName-error" : "merchantName-hint"
          }
          className={`mt-1.5 ${INPUT_BASE}`}
        />
        {errors.merchantName ? (
          <p id="merchantName-error" className="mt-1.5 text-sm text-rose-400">
            {errors.merchantName}
          </p>
        ) : (
          <p id="merchantName-hint" className="mt-1.5 text-xs text-slate-500">
            Shown on the customer&rsquo;s receipt.
          </p>
        )}
      </div>

      {/* Recipient ------------------------------------------------------ */}
      <div>
        <label
          htmlFor="recipient"
          className="block text-sm font-medium text-slate-200"
        >
          Merchant wallet address
        </label>
        <input
          id="recipient"
          name="recipient"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="0x…"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          aria-invalid={errors.recipient ? "true" : undefined}
          aria-describedby={
            errors.recipient ? "recipient-error" : "recipient-hint"
          }
          className={`mt-1.5 ${INPUT_BASE} font-mono`}
        />
        {errors.recipient ? (
          <p id="recipient-error" className="mt-1.5 text-sm text-rose-400">
            {errors.recipient}
          </p>
        ) : (
          <p id="recipient-hint" className="mt-1.5 text-xs text-slate-500">
            USDC will be sent here on Base mainnet.
          </p>
        )}
      </div>

      {/* Item ----------------------------------------------------------- */}
      <div>
        <label
          htmlFor="itemName"
          className="block text-sm font-medium text-slate-200"
        >
          Item or service
        </label>
        <input
          id="itemName"
          name="itemName"
          type="text"
          autoComplete="off"
          maxLength={ITEM_NAME_MAX_LENGTH}
          placeholder="Latte"
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          aria-invalid={errors.itemName ? "true" : undefined}
          aria-describedby={
            errors.itemName ? "itemName-error" : "itemName-hint"
          }
          className={`mt-1.5 ${INPUT_BASE}`}
        />
        {errors.itemName ? (
          <p id="itemName-error" className="mt-1.5 text-sm text-rose-400">
            {errors.itemName}
          </p>
        ) : (
          <p id="itemName-hint" className="mt-1.5 text-xs text-slate-500">
            What the customer is paying for. Appears on the receipt.
          </p>
        )}
      </div>

      {/* Quantity + unit price + total --------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-slate-200"
          >
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={errors.quantity ? "true" : undefined}
            aria-describedby={errors.quantity ? "quantity-error" : undefined}
            className={`mt-1.5 ${INPUT_BASE}`}
          />
          {errors.quantity ? (
            <p id="quantity-error" className="mt-1.5 text-sm text-rose-400">
              {errors.quantity}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="unitPrice"
            className="block text-sm font-medium text-slate-200"
          >
            Unit price (USDC)
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            aria-invalid={errors.unitPrice ? "true" : undefined}
            aria-describedby={errors.unitPrice ? "unitPrice-error" : undefined}
            className={`mt-1.5 ${INPUT_BASE}`}
          />
          {errors.unitPrice ? (
            <p id="unitPrice-error" className="mt-1.5 text-sm text-rose-400">
              {errors.unitPrice}
            </p>
          ) : null}
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-200">
            Total
          </span>
          <output
            htmlFor="quantity unitPrice"
            className={`mt-1.5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-slate-100 shadow-inner shadow-black/20 ${total ? "" : "text-slate-500"}`}
          >
            <span className="font-mono">
              {total ? formatAmount(total) : "0.00"}
            </span>
            <span className="text-xs text-slate-400">USDC</span>
          </output>
        </div>
      </div>

      {/* Customer label ------------------------------------------------- */}
      <div>
        <label
          htmlFor="customerLabel"
          className="block text-sm font-medium text-slate-200"
        >
          Customer label{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="customerLabel"
          name="customerLabel"
          type="text"
          autoComplete="off"
          maxLength={CUSTOMER_LABEL_MAX_LENGTH}
          placeholder="Table 5 · Order #1234"
          value={customerLabel}
          onChange={(event) => setCustomerLabel(event.target.value)}
          aria-invalid={errors.customerLabel ? "true" : undefined}
          aria-describedby={
            errors.customerLabel ? "customerLabel-error" : "customerLabel-hint"
          }
          className={`mt-1.5 ${INPUT_BASE}`}
        />
        {errors.customerLabel ? (
          <p
            id="customerLabel-error"
            className="mt-1.5 text-sm text-rose-400"
          >
            {errors.customerLabel}
          </p>
        ) : (
          <p id="customerLabel-hint" className="mt-1.5 text-xs text-slate-500">
            Shown to the customer on the receipt and checkout page.
          </p>
        )}
      </div>

      {/* Note ----------------------------------------------------------- */}
      <div>
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="note"
            className="block text-sm font-medium text-slate-200"
          >
            Internal note{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <span className="text-xs text-slate-500">
            {note.length} / {NOTE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Private to you — not shown to the customer."
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-invalid={errors.note ? "true" : undefined}
          aria-describedby={errors.note ? "note-error" : undefined}
          className={`mt-1.5 ${INPUT_BASE}`}
        />
        {errors.note ? (
          <p id="note-error" className="mt-1.5 text-sm text-rose-400">
            {errors.note}
          </p>
        ) : null}
      </div>

      {/* Form-level error ---------------------------------------------- */}
      {errors.form ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          {errors.form}
        </div>
      ) : null}

      {/* Submit -------------------------------------------------------- */}
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Live on Base mainnet. Creating this request is offchain &mdash; no
          gas needed.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_40px_-12px_rgba(33,81,245,0.6)] transition-shadow hover:shadow-[0_18px_50px_-12px_rgba(33,81,245,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden" />
          <span className="relative">
            {submitting ? "Creating…" : "Create payment request"}
          </span>
        </button>
      </div>
    </form>
  );
}

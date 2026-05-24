"use client";

/**
 * Base Point — `<PaymentForm />`.
 *
 * Client Component because we own the form state, run inline validation,
 * and call the (browser-side) `PaymentStore`. Renders nothing async at
 * import time, so it is safe to be referenced from a Server Component.
 *
 * Constraints honoured here (do not relax):
 *  - No Base Pay calls. Base Pay is invoked by the public payment page,
 *    not from `/create`.
 *  - No `@base-org/account` import — that lives in `lib/basePay.ts`.
 *  - No direct `localStorage` access — go through `getPaymentStore()`.
 *  - No mainnet, no balance reads, no transaction-history reads, no
 *    block-explorer or third-party indexer.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  NOTE_MAX_LENGTH,
  validateAddress,
  validateAmount,
  validateNote,
} from "@/lib/validators";
import { getPaymentStore } from "@/stores/paymentStore";

interface FieldErrors {
  recipient?: string;
  amount?: string;
  note?: string;
  /** Top-level error (e.g. storage failure) not tied to a single field. */
  form?: string;
}

const INPUT_BASE =
  "block w-full rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 transition focus:border-blue-400/50 focus:bg-slate-950/70 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

export function PaymentForm() {
  const router = useRouter();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const r = validateAddress(recipient);
    const a = validateAmount(amount);
    const n = validateNote(note);

    const nextErrors: FieldErrors = {};
    if (!r.ok) nextErrors.recipient = r.message;
    if (!a.ok) nextErrors.amount = a.message;
    if (!n.ok) nextErrors.note = n.message;

    if (!r.ok || !a.ok || !n.ok) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const record = await getPaymentStore().create({
        recipient: r.value,
        amountUsdc: a.value,
        note: n.value,
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
            USDC will be sent here on Base Sepolia.
          </p>
        )}
      </div>

      {/* Amount --------------------------------------------------------- */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-slate-200"
        >
          Amount (USDC)
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={errors.amount ? "true" : undefined}
          aria-describedby={errors.amount ? "amount-error" : "amount-hint"}
          className={`mt-1.5 ${INPUT_BASE}`}
        />
        {errors.amount ? (
          <p id="amount-error" className="mt-1.5 text-sm text-rose-400">
            {errors.amount}
          </p>
        ) : (
          <p id="amount-hint" className="mt-1.5 text-xs text-slate-500">
            Up to 6 decimal places, e.g.{" "}
            <span className="font-mono text-slate-400">10.50</span>.
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
            Note <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <span className="text-xs text-slate-500">
            {note.length} / {NOTE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Order #1234"
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
          Base Sepolia testnet only. No mainnet payments are ever sent.
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

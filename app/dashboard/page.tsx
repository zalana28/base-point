"use client";

/**
 * Base Point — `/dashboard`.
 *
 * Local MVP merchant dashboard. Displays payment-request stats, a
 * filterable payment list with actions (open checkout, open receipt,
 * copy links), and contextual empty/loading states.
 *
 * Includes payment-status recovery: merchants can re-check "processing"
 * payments that have a known paymentId/tx hash without adding any
 * external indexer, balance reads, or transaction-history scans.
 *
 * Client Component because it reads from `localStorage` via the
 * payment store. No @base-org/account import, no localStorage access
 * outside the store, no block-explorer or third-party indexer.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CopyButton } from "@/components/CopyButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import { formatAmount, formatDate, truncateAddress } from "@/lib/format";
import {
  canRecoverPayment,
  recoverPaymentStatus,
} from "@/lib/paymentRecovery";
import { getPaymentStore } from "@/stores/paymentStore";
import type { PaymentRequest, PaymentRequestStatus } from "@/types/payment";

// ---------- Filter types ------------------------------------------------------

type StatusFilter = "all" | PaymentRequestStatus;

// ---------- Main page component -----------------------------------------------

export default function DashboardPage() {
  const [payments, setPayments] = useState<PaymentRequest[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Recovery state
  const [recoveringIds, setRecoveringIds] = useState<Set<string>>(new Set());
  const [bulkRecovering, setBulkRecovering] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  // Load payments on mount (client-only)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const list = await getPaymentStore().list();
      if (!cancelled) setPayments(list);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived stats
  const stats = useMemo(() => {
    if (!payments) return null;
    const total = payments.length;
    const completed = payments.filter((p) => p.status === "completed").length;
    const pending = payments.filter(
      (p) => p.status === "pending" || p.status === "processing",
    ).length;
    const failed = payments.filter((p) => p.status === "failed").length;
    const totalUsdc = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + parseFloat(p.amountUsdc || "0"), 0);
    return { total, completed, pending, failed, totalUsdc };
  }, [payments]);

  // Filtered list
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    let list = payments;

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          (p.receiptId && p.receiptId.toLowerCase().includes(q)) ||
          (p.merchantName && p.merchantName.toLowerCase().includes(q)) ||
          (p.itemName && p.itemName.toLowerCase().includes(q)) ||
          p.recipient.toLowerCase().includes(q) ||
          (p.paymentId && p.paymentId.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [payments, statusFilter, searchQuery]);

  // ----- Single payment recovery -----
  const handleRecoverOne = useCallback(
    async (payment: PaymentRequest) => {
      if (!canRecoverPayment(payment)) return;

      setRecoveringIds((prev) => new Set(prev).add(payment.id));
      try {
        const recovered = await recoverPaymentStatus(payment);
        if (recovered.status !== payment.status) {
          const persisted = await getPaymentStore().update(payment.id, {
            status: recovered.status,
            settledAt: recovered.settledAt,
            errorMessage: recovered.errorMessage,
          });
          setPayments((prev) =>
            prev
              ? prev.map((p) => (p.id === persisted.id ? persisted : p))
              : prev,
          );
        }
      } finally {
        setRecoveringIds((prev) => {
          const next = new Set(prev);
          next.delete(payment.id);
          return next;
        });
      }
    },
    [],
  );

  // ----- Bulk recovery of all processing payments -----
  const handleRefreshAll = useCallback(async () => {
    if (!payments) return;
    const processing = payments.filter(canRecoverPayment);
    if (processing.length === 0) return;

    setBulkRecovering(true);
    const updates: PaymentRequest[] = [];

    for (const payment of processing) {
      try {
        const recovered = await recoverPaymentStatus(payment);
        if (recovered.status !== payment.status) {
          const persisted = await getPaymentStore().update(payment.id, {
            status: recovered.status,
            settledAt: recovered.settledAt,
            errorMessage: recovered.errorMessage,
          });
          updates.push(persisted);
        }
      } catch {
        // Don't block the whole batch if one fails.
      }
    }

    if (updates.length > 0) {
      setPayments((prev) => {
        if (!prev) return prev;
        const updateMap = new Map(updates.map((u) => [u.id, u]));
        return prev.map((p) => updateMap.get(p.id) ?? p);
      });
    }

    setLastChecked(Date.now());
    setBulkRecovering(false);
  }, [payments]);

  // Count of recoverable processing payments
  const recoverableCount = useMemo(
    () => (payments ? payments.filter(canRecoverPayment).length : 0),
    [payments],
  );

  // ---------- Loading state ---------------------------------------------------

  if (payments === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <LoadingSpinner />
          <p className="text-sm">Loading dashboard&hellip;</p>
        </div>
      </div>
    );
  }

  // ---------- Empty state -----------------------------------------------------

  if (payments.length === 0) {
    return (
      <div className="relative flex-1">
        <PageGlow />
        <div className="relative mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <DashboardHeader />
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center shadow-2xl shadow-black/20 backdrop-blur">
            <EmptyIcon />
            <h2 className="mt-4 text-lg font-semibold text-white">
              No payment requests yet
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Create your first checkout link. Wallet transfers move
              funds. Base Point gives merchants checkout links, receipts,
              and a payment record.
            </p>
            <Link
              href="/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-blue)] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:brightness-110"
            >
              Create payment request
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Loaded state ----------------------------------------------------

  return (
    <div className="relative flex-1">
      <PageGlow />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <DashboardHeader />

        {/* Positioning copy */}
        <p className="mt-4 max-w-2xl text-sm text-slate-400">
          Wallet transfers move funds. Base Point gives merchants checkout
          links, receipts, and a payment record.
        </p>

        {/* Stats */}
        {stats && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total requests" value={String(stats.total)} />
            <StatCard
              label="Completed"
              value={String(stats.completed)}
              accent="emerald"
            />
            <StatCard
              label="Pending / Processing"
              value={String(stats.pending)}
              accent="amber"
            />
            <StatCard
              label="Failed"
              value={String(stats.failed)}
              accent="red"
            />
            <StatCard
              label="Total USDC"
              value={`$${formatAmount(stats.totalUsdc.toFixed(6))}`}
              accent="cyan"
            />
          </div>
        )}

        {/* Bulk recovery bar */}
        {recoverableCount > 0 && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-blue-400/20 bg-blue-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-blue-200">
                {recoverableCount} processing{" "}
                {recoverableCount === 1 ? "payment" : "payments"} with
                known IDs
              </p>
              <p className="text-xs text-slate-400">
                Base Point only checks payment IDs it already created. It
                does not scan wallet history.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastChecked && (
                <span className="text-[11px] text-slate-500">
                  Last checked {formatDate(lastChecked)}
                </span>
              )}
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={bulkRecovering}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkRecovering ? (
                  <>
                    <SmallSpinner />
                    Checking&hellip;
                  </>
                ) : (
                  <>
                    <RefreshIcon />
                    Refresh processing payments
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {(
              ["all", "pending", "processing", "completed", "failed"] as const
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by receipt, merchant, item, address, tx hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-white/20 sm:max-w-xs"
          />
        </div>

        {/* Payment list */}
        <div className="mt-6 space-y-3">
          {filteredPayments.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center text-sm text-slate-500">
              No payments match your filters.
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                recovering={recoveringIds.has(payment.id)}
                onRecover={handleRecoverOne}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------------------------------------------------

function DashboardHeader() {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col items-start gap-2">
        <NetworkBadge />
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Dashboard
        </h1>
      </div>
      <Link
        href="/create"
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-blue)] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:brightness-110"
      >
        <PlusIcon />
        New request
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber" | "red" | "cyan";
}) {
  const accentColor = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
  }[accent ?? "emerald"];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent ? accentColor : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function PaymentCard({
  payment,
  recovering,
  onRecover,
}: {
  payment: PaymentRequest;
  recovering: boolean;
  onRecover: (payment: PaymentRequest) => void;
}) {
  const checkoutUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pay/${payment.id}`
      : `/pay/${payment.id}`;

  const receiptUrl =
    payment.receiptId && typeof window !== "undefined"
      ? `${window.location.origin}/receipt/${payment.receiptId}`
      : payment.receiptId
        ? `/receipt/${payment.receiptId}`
        : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur transition-colors hover:bg-white/[0.05] sm:p-5">
      {/* Top row: identity + status */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          {payment.receiptId && (
            <span className="font-mono text-xs text-slate-400">
              {payment.receiptId}
            </span>
          )}
          <span className="text-sm font-medium text-white">
            {payment.merchantName || payment.itemName
              ? [payment.merchantName, payment.itemName]
                  .filter(Boolean)
                  .join(" \u2014 ")
              : truncateAddress(payment.recipient)}
          </span>
        </div>
        <StatusPill status={payment.status} />
      </div>

      {/* Details row */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        <span>
          <span className="text-slate-500">Amount:</span>{" "}
          <span className="text-slate-200">
            {formatAmount(payment.amountUsdc)} USDC
          </span>
        </span>
        <span>
          <span className="text-slate-500">Created:</span>{" "}
          {formatDate(payment.createdAt)}
        </span>
        <span>
          <span className="text-slate-500">To:</span>{" "}
          {truncateAddress(payment.recipient)}
        </span>
        {payment.paidVia && (
          <span>
            <span className="text-slate-500">Via:</span>{" "}
            {payment.paidVia === "base-pay" ? "Base Pay" : "Wallet"}
          </span>
        )}
        {payment.paymentId && (
          <span className="font-mono">
            <span className="font-sans text-slate-500">Tx:</span>{" "}
            {truncateAddress(payment.paymentId, 10, 6)}
          </span>
        )}
      </div>

      {/* Actions row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/pay/${payment.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/10"
        >
          Open checkout
        </Link>
        <CopyButton value={checkoutUrl} label="Copy link" size="sm" />
        {payment.receiptId && (
          <>
            <Link
              href={`/receipt/${payment.receiptId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              Open receipt
            </Link>
            {receiptUrl && (
              <CopyButton
                value={receiptUrl}
                label="Copy receipt link"
                size="sm"
              />
            )}
          </>
        )}
        {/* Recovery action for processing payments */}
        {canRecoverPayment(payment) && (
          <button
            type="button"
            onClick={() => onRecover(payment)}
            disabled={recovering}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-200 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {recovering ? (
              <>
                <SmallSpinner />
                Checking&hellip;
              </>
            ) : (
              "Check status"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: PaymentRequestStatus }) {
  const config = {
    pending: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
    processing: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
    completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
    failed: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}

// ---------- Icons & decorative ------------------------------------------------

function PageGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-72 w-full max-w-3xl bg-[radial-gradient(closest-side,rgba(33,81,245,0.22),transparent_75%)] blur-3xl"
    />
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SmallSpinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className="h-12 w-12 text-slate-600"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="10"
        width="36"
        height="28"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M6 18h36"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="12"
        y="24"
        width="16"
        height="3"
        rx="1.5"
        fill="currentColor"
        className="opacity-40"
      />
      <rect
        x="12"
        y="30"
        width="10"
        height="3"
        rx="1.5"
        fill="currentColor"
        className="opacity-25"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M1.5 8a6.5 6.5 0 0 1 11.3-4.4M14.5 8a6.5 6.5 0 0 1-11.3 4.4" />
      <path d="M12.8 1v2.6h-2.6M3.2 15v-2.6h2.6" />
    </svg>
  );
}

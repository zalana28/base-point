/**
 * Base Point — Supabase client (browser-safe).
 *
 * Creates a Supabase client ONLY if both `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present in the environment. When
 * the env vars are missing (local dev without Supabase, CI, etc.) the
 * module exports `null` and the app falls back to localStorage-only mode.
 *
 * Constraints:
 *  - No auth. This client uses the anon key with Row Level Security
 *    (if configured in the Supabase dashboard). Auth is out of scope
 *    for this PR.
 *  - Does NOT import @base-org/account or touch payment initiation.
 *  - Does NOT read balances, transaction history, or indexer APIs.
 *  - Safe to import from server and client components alike.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Whether Supabase is configured in this build. UI can use this to show
 * local-mode warnings when false.
 */
export const isSupabaseEnabled: boolean =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/**
 * The Supabase client instance, or `null` if env vars are missing.
 *
 * Callers MUST check for `null` before using. The payment store factory
 * (`getPaymentStore`) handles this automatically.
 */
export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/Header";
import { Web3Provider } from "@/components/Web3Provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Base Point — USDC checkout for merchants on Base",
  description:
    "QR-style USDC checkout for merchants on Base Sepolia. Generate a payment link, share the QR, and let customers pay with Base Pay or any EVM wallet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full overflow-x-hidden bg-slate-950 text-slate-100">
        {/*
          App-wide background. A subtle fixed gradient + a couple of
          large blurred radial glows give every route a consistent
          "premium" base without polluting page templates.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(33,81,245,0.22),transparent_60%),radial-gradient(ellipse_60%_50%_at_90%_110%,rgba(34,211,238,0.12),transparent_55%),linear-gradient(180deg,#020617_0%,#040614_55%,#02050d_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        <Web3Provider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-slate-500">
              Base Point &middot; Base Sepolia testnet only &middot; No mainnet
              payments are ever sent
            </footer>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}

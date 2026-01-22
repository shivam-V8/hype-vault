import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";

import "./globals.css";
import { WalletStatus } from "@/components/WalletStatus";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hyper Vault LP Dashboard",
  description:
    "Non-custodial vault UI for LPs to track performance, deposits, and withdrawals.",
};

const navigation = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Deposit / Withdraw", href: "/deposit" },
  { label: "Positions", href: "/positions" },
  { label: "Activity", href: "/activity" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-50`}
      >
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-16">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6">
              <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Link
                    href="/"
                    className="text-2xl font-bold tracking-wide text-white"
                  >
                    Hyper Vault
                  </Link>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    LP Portal
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full px-3 py-1 transition hover:bg-white/10 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <WalletStatus />
              </header>
              <main className="flex-1">{children}</main>
            </div>
            <footer className="mx-auto mt-10 max-w-6xl px-5 text-xs text-slate-500">
              Built for Hyper-EVM vaults · All user funds remain on-chain ·
              Execution lives with the bot
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

import Link from "next/link";

const highlights = [
  {
    title: "Vault Participants (LPs)",
    description:
      "Deposit USDC, monitor TVL/APY, and withdraw without ever touching Hyperliquid keys.",
  },
  {
    title: "Vault Operator (Bot)",
    description:
      "Execution is handled by the bot via Hyperliquid; the UI stays read-only and focuses on transparency.",
  },
  {
    title: "Security Model",
    description:
      "Hyper-EVM vault + risk manager keep funds on-chain while Hyperliquid handles off-chain matching.",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-slate-950/60">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          Hyper-EVM & Hyperliquid
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl">
          Passive LP experience for the Hyper Vault.
        </h1>
        <p className="mt-5 max-w-3xl text-base text-slate-300">
          Monitor vault health, check strategy exposure, and manage USDC deposits.
          Vault participants never trade directly—the bot, Executor, and Hyperliquid
          handle execution while you stay informed.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 transition hover:brightness-110"
          >
            Open Dashboard
          </Link>
          <Link
            href="/deposit"
            className="rounded-full border border-slate-400/70 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white"
          >
            Deposit / Withdraw
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-wide text-white">
          What you can expect
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 text-sm text-slate-300 shadow-lg shadow-slate-950/60"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {item.title}
              </p>
              <p className="mt-3 text-base leading-relaxed text-slate-200">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
        <h3 className="text-base font-semibold uppercase tracking-[0.3em] text-slate-300">
          MVP Checklist
        </h3>
        <ul className="mt-4 space-y-3 text-slate-300">
          <li>Wallet connect + deposit/withdraw flows</li>
          <li>Vault stats, risk status, and Hyperliquid transparency</li>
          <li>Activity feed mapping on-chain events + Hyperliquid executions</li>
        </ul>
      </section>
    </div>
  );
}

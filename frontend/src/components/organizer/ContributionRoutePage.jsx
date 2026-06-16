"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ContributionsPanel from "@/components/organizer/ContributionsPanel.jsx";

export default function ContributionRoutePage({ initialView = "contributors" }) {
  const { id } = useParams();

  return (
    <main className="min-h-screen bg-r-bg px-6 py-6 text-r-text sm:px-[50px]">
      <nav className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
          <span className="text-2xl leading-8 [font-family:var(--font-family-display)]">Remember</span>
        </Link>
        <Link
          href={`/memorial/${id}/manage`}
          className="rounded-full border border-r-border px-5 py-2 text-[15px] text-r-secondary transition hover:bg-r-card"
        >
          Back to memorial
        </Link>
      </nav>

      <section className="mx-auto mt-12 max-w-[960px]">
        <div className="mb-8">
          <p className="text-[15px] leading-5 text-r-secondary">Organizer layer</p>
          <h1 className="mt-2 text-[42px] leading-[46px] text-r-text [font-family:var(--font-family-display)]">
            Contributions
          </h1>
        </div>

        <ContributionsPanel memorialId={id} initialView={initialView} />
      </section>
    </main>
  );
}

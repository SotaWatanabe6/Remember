"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header2 from "@/components/ui-components/navs/header2";
import { getMemorials } from "@/services/memorialService.js";
import AccountProfileCard from "./_components/account-profile-card";

export default function AccountBoardPage() {
  const [memorials, setMemorials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadMemorials = async () => {
      try {
        const nextMemorials = await getMemorials();

        if (!isCancelled) {
          setMemorials(nextMemorials);
          setLoadError("");
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(
            error.message || "Unable to load your memorials right now.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadMemorials();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <>
      <Header2 />

      <main className="mx-auto flex w-full max-w-[1340px] flex-col pb-16 pt-[96px] sm:pb-24 sm:pt-[110px]">
        <section className="relative flex min-h-[280px] flex-col items-center justify-center px-4 text-center">
          <div className="mb-9 flex size-[124px] items-center justify-center rounded-full bg-[#C4D2E3]" />
          <h1 className="text-h1 text-[#0A0A0A]">Your Memorials</h1>
          <p className="mt-5 text-body-1 text-(--text-color-2)">
            All memorials you created will be stored here
          </p>
        </section>

        <section
          className="mt-[72px] grid grid-cols-1 gap-6 lg:grid-cols-3"
          aria-label="Memorial profiles"
        >
          <Link
            href="/memorial/create"
            className="flex min-h-[365px] flex-col items-center justify-center rounded-[20px] border border-[#D7DBE2] bg-white px-8 text-center shadow-[0_1px_10px_rgba(0,0,0,0.04)] transition hover:border-[#0A0A0A] hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
          >
            <span className="flex size-[52px] items-center justify-center rounded-full border border-[#5F5F5F] text-[40px] font-light leading-none text-[#5F5F5F]">
              +
            </span>
            <span className="mt-6 text-[24px] font-medium leading-[32px] text-[#0A0A0A]">
              Create new
            </span>
          </Link>

          {isLoading ? (
            <article className="flex min-h-[365px] items-center justify-center rounded-[20px] border border-[#D7DBE2] bg-white px-8 text-center text-body-1 text-(--text-color-2) shadow-[0_1px_10px_rgba(0,0,0,0.04)]">
              Loading memorials...
            </article>
          ) : null}

          {!isLoading && loadError ? (
            <article className="flex min-h-[365px] items-center justify-center rounded-[20px] border border-[#F2C7C7] bg-white px-8 text-center text-body-1 text-red-600 shadow-[0_1px_10px_rgba(0,0,0,0.04)]">
              {loadError}
            </article>
          ) : null}

          {!isLoading && !loadError && memorials.length === 0 ? (
            <article className="flex min-h-[365px] items-center justify-center rounded-[20px] border border-[#D7DBE2] bg-white px-8 text-center text-body-1 text-(--text-color-2) shadow-[0_1px_10px_rgba(0,0,0,0.04)]">
              You haven&apos;t created any memorials yet.
            </article>
          ) : null}

          {!isLoading && !loadError
            ? memorials.map((memorial) => (
                <Link
                  key={memorial.id}
                  href={`/memorial/${memorial.id}/manage`}
                  className="rounded-[20px] transition hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
                >
                  <AccountProfileCard memorial={memorial} />
                </Link>
              ))
            : null}
        </section>
      </main>
    </>
  );
}

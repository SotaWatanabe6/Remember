"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header2 from "@/components/ui-components/navs/header2";
import { SkeletonCard, SkeletonText } from "@/components/ui-components/skeleton-loader";
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
    <div className="p-(--page-pad-x)">
      <Header2 />

      <main className="mx-auto flex w-full max-w-[1340px] flex-col px-6 pb-16 pt-[96px] sm:px-[50px] sm:pb-24 sm:pt-[110px]">
        <section className="relative flex min-h-[200px] sm:min-h-[280px] flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 sm:mb-9 flex size-[80px] sm:size-[124px] items-center justify-center rounded-full bg-[#C4D2E3]" />
          <h1 className="font-family-display text-2xl text-r-text sm:text-h1">
            Your Memorials
          </h1>
          <p className="mt-5 font-family-body text-body-1 text-r-secondary">
            All memorials you created will be stored here
          </p>
        </section>

        <section
          className="mt-[72px] grid grid-cols-1 gap-6 lg:grid-cols-3"
          aria-label="Memorial profiles"
        >
          <Link
            href="/memorial/create"
            className="flex min-h-[365px] flex-col items-center justify-center rounded-[20px] border border-r-border bg-white px-8 text-center shadow-[0_1px_10px_rgba(0,0,0,0.04)] transition hover:border-r-border-focus hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus"
          >
            <span className="flex size-[52px] items-center justify-center rounded-full border border-r-btn-text text-[40px] font-light leading-none text-r-btn-text">
              +
            </span>
            <span className="mt-6 font-family-display text-[24px] font-medium leading-[32px] text-r-text">
              Create new
            </span>
          </Link>

          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-[20px] border border-[#D7DBE2] bg-white px-8 py-8 shadow-[0_1px_10px_rgba(0,0,0,0.04)]"
                >
                  <div className="space-y-4">
                    <SkeletonCard className="h-32 w-32 rounded-full mx-auto" />
                    <SkeletonText lines={3} className="text-center" />
                  </div>
                </div>
              ))}
            </>
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
    </div>
  );
}

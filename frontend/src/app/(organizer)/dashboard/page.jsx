"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RememberLogoMark } from "@/components/brand/RememberLogo.jsx";
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

      <main className="mx-auto flex w-full max-w-[1340px] flex-col px-6 pb-16 pt-[70px] sm:px-[50px] sm:pb-24 sm:pt-[86px]">
        <section className="relative flex min-h-[320px] flex-col items-center justify-center px-4 text-center sm:min-h-[360px]">
          <RememberLogoMark className="mb-10 h-[124px] w-[118px]" priority />
          <h1 className="font-family-display text-[40px] font-bold leading-[40px] tracking-[0px] text-r-text">
            Your Memorials
          </h1>
          <p className="mt-6 font-family-body text-[20px] leading-[20px] tracking-[0px] text-[#5F5A52]">
            All memorials you created will be stored here
          </p>
        </section>

        <section
          className="mt-[44px] grid grid-cols-1 gap-6 lg:grid-cols-3"
          aria-label="Memorial profiles"
        >
          <Link
            href="/memorial/create"
            className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-r-border bg-[#F2EAE2] px-8 text-center transition hover:border-r-border-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus"
          >
            <span className="flex size-[58px] items-center justify-center rounded-full bg-r-text text-[42px] font-light leading-none text-[#F2EAE2]">
              +
            </span>
            <span className="mt-7 font-family-display text-[34px] leading-[40px] text-r-text">
              Create new
            </span>
          </Link>

          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-[28px] border border-r-border bg-[#F2EAE2]"
                >
                  <SkeletonCard className="h-[255px] w-full rounded-none bg-[#E8DDD2]" />
                  <div className="space-y-4 px-6 py-6">
                    <SkeletonText lines={2} className="max-w-[220px]" />
                    <SkeletonCard className="h-[44px] w-[180px] rounded-[14px] bg-[#E3D8CD]" />
                    <SkeletonText lines={1} className="max-w-[250px]" />
                  </div>
                </div>
              ))}
            </>
          ) : null}

          {!isLoading && loadError ? (
            <article className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-[#E2B9B1] bg-[#F2EAE2] px-8 text-center text-[18px] leading-[28px] text-red-600">
              {loadError}
            </article>
          ) : null}

          {!isLoading && !loadError && memorials.length === 0 ? (
            <article className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-r-border bg-[#F2EAE2] px-8 text-center text-[18px] leading-[28px] text-r-secondary">
              You haven&apos;t created any memorials yet.
            </article>
          ) : null}

          {!isLoading && !loadError
              ? memorials.map((memorial) => (
                <Link
                  key={memorial.id}
                  href={`/memorial/${memorial.id}/manage`}
                  className="rounded-[28px] transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
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

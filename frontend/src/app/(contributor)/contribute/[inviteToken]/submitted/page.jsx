"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getContributorSubmittedDraft } from "@/services/contributorService.js";

const submittedErrorCopy = {
  invalid: {
    title: "This invitation link is not available",
    body: "Please check the link or ask the memorial organizer to send a new invitation.",
  },
  expired: {
    title: "This invitation has expired",
    body: "The contribution window for this link has passed. The organizer can share a new link if they are still collecting memories.",
  },
  closed: {
    title: "Contributions are closed",
    body: "This memorial is not accepting new contributions right now. Thank you for wanting to share a memory.",
  },
  missing: {
    title: "We could not find your contribution draft",
    body: "Please return to the invitation page and enter your name before submitting memories.",
  },
  error: {
    title: "We could not open this confirmation",
    body: "Something went wrong while loading this page. Your organizer can confirm that your contribution was received.",
  },
};

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <div className="size-12 rounded-full border-2 border-slate-200 border-t-neutral-950" />
        <p className="text-base leading-6 text-slate-600">Opening confirmation...</p>
      </section>
    </main>
  );
}

function SubmittedErrorState({ status, inviteToken }) {
  const copy = submittedErrorCopy[status] ?? submittedErrorCopy.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <section className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-medium text-slate-600">
          R
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-[32px] font-medium leading-[38px] text-neutral-950 sm:text-[40px] sm:leading-[48px]">
            {copy.title}
          </h1>
          <p className="text-base leading-7 text-slate-600 sm:text-lg">{copy.body}</p>
        </div>
        {status === "missing" ? (
          <Link
            href={`/contribute/${inviteToken}`}
            className="mt-2 flex h-[52px] items-center justify-center rounded-full bg-neutral-950 px-8 text-base font-bold leading-6 text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500"
          >
            Return to invitation
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function MemorialAvatar({ name, photoUrl }) {
  const initial = useMemo(() => name.trim().charAt(0).toUpperCase() || "R", [name]);

  return (
    <div className="relative flex size-[132px] items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[52px] font-medium text-slate-500 shadow-auth sm:size-[156px] sm:text-[60px]">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Photo of ${name}`}
          fill
          sizes="(min-width: 640px) 156px, 132px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  );
}

export default function SubmittedPage() {
  const { inviteToken } = useParams();
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSubmitted() {
      setIsLoading(true);
      try {
        const submittedDraft = await getContributorSubmittedDraft(inviteToken);
        if (isMounted) {
          setDraft(submittedDraft);
        }
      } catch {
        if (isMounted) {
          setDraft({ status: "error", invite: null, session: null });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSubmitted();

    return () => {
      isMounted = false;
    };
  }, [inviteToken]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!draft || draft.status !== "ready") {
    return <SubmittedErrorState status={draft?.status ?? "error"} inviteToken={inviteToken} />;
  }

  const subjectName = draft.invite.deceased.name;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[680px] flex-col gap-10">
        <nav className="flex h-10 items-center justify-between">
          <span className="text-2xl leading-8 text-neutral-950">Remember</span>
        </nav>

        <section className="flex flex-1 flex-col items-center justify-center gap-8 pb-16 text-center">
          <div className="flex size-[105px] items-center justify-center rounded-full bg-[#dbe7f3] text-neutral-950">
            <svg width="46" height="46" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="flex max-w-[560px] flex-col items-center gap-4">
            <h1 className="text-[36px] font-medium leading-[42px] text-neutral-950 sm:text-[40px] sm:leading-[48px]">
              Your contribution was received.
            </h1>
            <p className="text-base leading-7 text-slate-600 sm:text-lg">
              Thank you for sharing your memories of {subjectName}. They will help shape this
              memorial.
            </p>
          </div>

          <MemorialAvatar name={subjectName} photoUrl={draft.invite.deceased.photoUrl} />
        </section>
      </div>
    </main>
  );
}
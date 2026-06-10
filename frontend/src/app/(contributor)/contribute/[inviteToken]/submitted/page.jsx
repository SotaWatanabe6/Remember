"use client";

// frontend/src/app/(contributor)/contribute/[inviteToken]/submitted/page.jsx

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MemorialCoverImage from "@/components/memorial/MemorialCoverImage.jsx";
import { getContributorSubmittedDraft } from "@/services/contributorService.js";

// ─── Error copy ────────────────────────────────────────────────────────────────

const submittedErrorCopy = {
  invalid: { title: "This invitation link is not available", body: "Please check the link or ask the memorial organizer to send a new invitation." },
  expired: { title: "This invitation has expired", body: "The contribution window for this link has passed. The organizer can share a new link if they are still collecting memories." },
  closed: { title: "Contributions are closed", body: "This memorial is not accepting new contributions right now. Thank you for wanting to share a memory." },
  missing: { title: "We could not find your contribution draft", body: "Please return to the invitation page and enter your name before submitting memories." },
  error: { title: "We could not open this confirmation", body: "Something went wrong while loading this page. Your organizer can confirm that your contribution was received." },
};

// ─── Loading state ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-[50px] bg-r-bg">
      <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <div
          className="size-12 rounded-full border-2"
          style={{ borderColor: 'var(--color-r-border)', borderTopColor: 'var(--color-r-text)' }}
        />
        <p className="text-body-2 text-r-secondary">Opening confirmation...</p>
      </section>
    </main>
  );
}

// ─── Error state ───────────────────────────────────────────────────────────────

function SubmittedErrorState({ status, inviteToken }) {
  const copy = submittedErrorCopy[status] ?? submittedErrorCopy.error;
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-[50px] bg-r-bg">
      <section className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full text-2xl font-medium bg-r-card text-r-muted">
          R
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-h1 text-r-text">{copy.title}</h1>
          <p className="text-body-2 text-r-secondary">{copy.body}</p>
        </div>
        {status === "missing" ? (
          <Link
            href={`/contribute/${inviteToken}`}
            className="mt-2 flex h-[52px] items-center justify-center rounded-full px-8 text-body-2 font-medium transition hover:opacity-80 bg-r-btn text-r-btn-text"
          >
            Return to invitation
          </Link>
        ) : null}
      </section>
    </main>
  );
}

// ─── Memorial Avatar — logic unchanged ────────────────────────────────────────

function MemorialAvatar({ name, photoUrl }) {
  return (
    <div className="relative size-[180px] overflow-hidden">
      <MemorialCoverImage
        src={photoUrl}
        name={name}
        fill
        className="h-full w-full text-[52px] sm:text-[60px]"
        fallbackClassName="bg-r-shape text-white text-[52px] font-medium"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubmittedPage() {
  const { inviteToken } = useParams();
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    async function loadSubmitted() {
      setIsLoading(true);
      try {
        const submittedDraft = await getContributorSubmittedDraft(inviteToken);
        if (isMounted) setDraft(submittedDraft);
      } catch {
        if (isMounted) setDraft({ status: "error", invite: null, session: null });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSubmitted();
    return () => { isMounted = false; };
  }, [inviteToken]);

  if (isLoading) return <LoadingState />;
  if (!draft || draft.status !== "ready") {
    return <SubmittedErrorState status={draft?.status ?? "error"} inviteToken={inviteToken} />;
  }

  const subjectName = draft.invite.deceased.name; // kept for MemorialAvatar if re-enabled

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[680px] flex-col gap-8">

        <nav className="flex h-10 items-center justify-between">
          <span className="text-2xl leading-8 text-r-text">Remember</span>
          <Link href="/login" className="text-body-2 text-r-secondary transition-opacity hover:opacity-70">
            Log In / Sign Up
          </Link>
        </nav>

        <section className="flex flex-1 flex-col items-center justify-center gap-8 pb-16 text-center">

          <div className="flex max-w-[560px] flex-col items-center gap-4">
            <h1 className="text-h1 text-r-text">Submission completed</h1>
            <p className="text-body-2 text-r-secondary">
              Thank you for sharing these precious moments. Your memories will be treasured
              and help keep their spirit alive.
            </p>
          </div>

          <div className="relative" style={{ width: "180px", height: "180px" }}>
            <MemorialAvatar
              name={subjectName}
              photoUrl={draft.invite.deceased.photoUrl}
            />
          </div>

          <button
          onClick={() => router.push(`/contribute/${inviteToken}`)}
          className="rounded-full text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
          style={{ width: '320px', padding: '16px 0' }}
        >
          Start from beginning
        </button>

        </section>
      </div>
    </main>
  );
}

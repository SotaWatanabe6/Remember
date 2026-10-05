'use client';

// frontend/src/components/contributor/PrivacySelector.jsx

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getContributorPrivacyDraft,
  saveContributorPrivacy,
} from "@/services/contributorService.js";

const privacyErrorCopy = {
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
  error: {
    title: "We could not open your contribution",
    body: "Please return to the invitation page and try again.",
  },
  missing: {
    title: "We could not find your contribution draft",
    body: "Please return to the invitation page and enter your name before choosing your privacy setting.",
  },
};

function ContributorNav({ backHref }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 sm:px-[50px] py-6">
      <div className="flex items-center gap-2">
        <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
        <span className="text-r-text text-2xl leading-8 font-display">Remember</span>
      </div>
      <Link href={backHref} className="flex items-center gap-2 text-r-text transition-opacity hover:opacity-70">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z" fill="currentColor"/>
        </svg>
        <span className="text-base font-normal">Back</span>
      </Link>
    </nav>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-r-bg text-r-text px-6 py-10 sm:px-[50px]">
      <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <div className="size-12 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-r-border)', borderTopColor: 'var(--color-r-text)' }} />
        <p className="text-body-2 text-r-secondary">Opening your contribution...</p>
      </section>
    </main>
  );
}

function PrivacyErrorState({ status, inviteToken }) {
  const copy = privacyErrorCopy[status] ?? privacyErrorCopy.invalid;

  return (
    <main className="flex min-h-screen items-center justify-center bg-r-bg text-r-text px-6 py-10 sm:px-[50px]">
      <section className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-r-card text-2xl font-medium text-r-secondary">
          R
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-h1 text-r-text">{copy.title}</h1>
          <p className="text-body-2 text-r-secondary">{copy.body}</p>
        </div>
        {status === "missing" ? (
          <Link
            href={`/contribute/${inviteToken}/public-contributor`}
            className="mt-2 flex h-[56px] items-center justify-center rounded-full px-8 text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
          >
            Enter your name
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function PrivacyOptionCard({ label, isSelected, isBusy, isDisabled, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      disabled={isDisabled}
      onClick={onSelect}
      className={`flex min-h-[351px] w-full max-w-[433px] items-center justify-center rounded-[20px] border border-[#97877B] px-6 text-center transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus disabled:cursor-not-allowed disabled:opacity-55 ${
        isSelected ? "bg-r-card" : "bg-transparent hover:bg-r-card/45"
      }`}
    >
      <span className="[font-family:var(--font-family-display)] text-2xl font-medium leading-[31px] text-r-muted whitespace-pre-line">
        {isBusy ? "Saving..." : label}
      </span>
    </button>
  );
}

export default function PrivacySelector({ inviteToken }) {
  const router = useRouter();
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selection, setSelection] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      let privacyDraft;

      try {
        privacyDraft = await getContributorPrivacyDraft(inviteToken);
      } catch (err) {
        console.error("Failed to load contributor privacy draft.", err);
        privacyDraft = { status: "error", invite: null, session: null };
      }

      if (!isMounted) return;

      setDraft(privacyDraft);
      setSelection(
        typeof privacyDraft?.is_anonymous === "boolean" ? privacyDraft.is_anonymous : null,
      );
      setIsLoading(false);
    }

    load();
    return () => { isMounted = false; };
  }, [inviteToken]);

  async function handleSelect(isAnonymous) {
    if (isSaving) return;

    setSelection(isAnonymous);
    setSubmitError("");
    setIsSaving(true);

    try {
      await saveContributorPrivacy(inviteToken, isAnonymous);
      router.push(`/contribute/${inviteToken}/relationship`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "We could not save your choice yet. Please try again.",
      );
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!draft || draft.status !== "ready") {
    return <PrivacyErrorState status={draft?.status ?? "invalid"} inviteToken={inviteToken} />;
  }

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">
      <ContributorNav backHref={`/contribute/${inviteToken}/public-contributor`} />

      <div className="flex-1 px-6 sm:px-[50px] pt-6 pb-16">
        <div className="mx-auto flex w-full max-w-[886px] flex-col items-center pt-[101px] max-sm:pt-16">

          <div className="flex flex-col items-center gap-5 text-center">
            <h1 className="[font-family:var(--font-family-display)] text-[40px] font-bold leading-[52px] text-r-text">
              Contribution privacy
            </h1>
            <p className="text-xl leading-[26px] text-r-secondary">
              Would you like to include your name in your contributions for viewers of the memorial to see?
            </p>
          </div>

          <div
            className="mt-[100px] grid w-full grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 max-sm:mt-16"
            role="radiogroup"
            aria-label="Contribution privacy"
          >
            <PrivacyOptionCard
              label={"Include my name in\ncontributions"}
              isSelected={selection === false}
              isBusy={isSaving && selection === false}
              isDisabled={isSaving}
              onSelect={() => handleSelect(false)}
            />
            <PrivacyOptionCard
              label={"I want to remain\nanonymous"}
              isSelected={selection === true}
              isBusy={isSaving && selection === true}
              isDisabled={isSaving}
              onSelect={() => handleSelect(true)}
            />
          </div>

          {submitError ? (
            <p className="mt-6 text-center text-sm leading-5 text-r-danger" role="alert">{submitError}</p>
          ) : null}

        </div>
      </div>
    </main>
  );
}

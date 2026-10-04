'use client';

// frontend/src/components/contributor/PrivacySelector.jsx

import Link from "next/link";
import ContributorEntryNav from "@/components/contributor/ContributorEntryNav.jsx";
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

function PrivacyOptionCard({ label, isSelected, isBusy, isDisabled, value, onSelect }) {
  return (
    <label className="relative w-full max-w-[433px] cursor-pointer">
      <input
        type="radio"
        name="contribution-privacy"
        value={value}
        checked={isSelected}
        disabled={isDisabled}
        onChange={onSelect}
        onClick={() => { if (isSelected) onSelect(); }}
        className="peer sr-only"
      />
      <span className={`flex min-h-[180px] sm:min-h-[382px] w-full items-center justify-center rounded-[20px] border border-r-muted px-6 text-center transition duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-r-border-focus peer-disabled:cursor-not-allowed peer-disabled:opacity-55 ${
        isSelected ? "bg-r-card" : "bg-transparent hover:bg-r-card/45"
      }`}>
        <span className="font-display text-2xl font-medium leading-[31px] text-r-muted">
          {isBusy ? "Saving..." : label}
        </span>
      </span>
    </label>
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

    const previousSelection = selection;
    setSelection(isAnonymous);
    setSubmitError("");
    setIsSaving(true);

    try {
      await saveContributorPrivacy(inviteToken, isAnonymous);
      router.push(`/contribute/${inviteToken}/relationship`);
    } catch (err) {
      setSelection(previousSelection);
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
    <main className="min-h-screen bg-r-bg px-6 py-8 text-r-text sm:px-[50px] sm:py-[50px]">
      <ContributorEntryNav backHref={`/contribute/${inviteToken}/public-contributor`} />

      <div className="pb-16">
        <div className="mx-auto flex w-full max-w-[886px] flex-col items-center pt-[100px] max-sm:pt-16">

          <div className="flex flex-col items-center gap-5 text-center">
            <h1 className="[font-family:var(--font-family-display)] text-[32px] font-bold leading-10 text-r-text sm:text-[40px] sm:leading-[45.725px]">
              Contribution privacy
            </h1>
            <p className="text-xl leading-[26px] text-r-secondary">
              Would you like to include your name in your contributions for viewers of the memorial to see?
            </p>
          </div>

          <div
            className="mt-[100px] grid w-full grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 max-sm:mt-16"
            role="radiogroup"
            aria-busy={isSaving}
            aria-label="Contribution privacy"
          >
            <PrivacyOptionCard
              label="Show my name"
              value="named"
              isSelected={selection === false}
              isBusy={isSaving && selection === false}
              isDisabled={isSaving}
              onSelect={() => handleSelect(false)}
            />
            <PrivacyOptionCard
              label="Stay anonymous"
              value="anonymous"
              isSelected={selection === true}
              isBusy={isSaving && selection === true}
              isDisabled={isSaving}
              onSelect={() => handleSelect(true)}
            />
          </div>

          <p className="mt-6 max-w-[578px] text-center text-base leading-6 text-r-secondary">
            If you stay anonymous, viewers will see your relationship instead of your name. The organizer will always see your real name.
          </p>

          {submitError ? (
            <p className="mt-6 text-center text-sm leading-5 text-r-danger" role="alert">{submitError}</p>
          ) : null}

        </div>
      </div>
    </main>
  );
}

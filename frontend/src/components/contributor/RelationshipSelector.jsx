'use client';

// frontend/src/components/contributor/RelationshipSelector.jsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getContributorRelationshipDraft,
  saveContributorRelationship,
} from "@/services/contributorService.js";
import {
  CONTRIBUTOR_RELATIONSHIP_OPTIONS,
  CONTRIBUTOR_FAMILY_RELATIONSHIP_OPTIONS,
  CONTRIBUTOR_RELATIONSHIP_FAMILY,
  CONTRIBUTOR_RELATIONSHIP_FRIEND,
  CONTRIBUTOR_RELATIONSHIP_COLLEAGUE,
  CONTRIBUTOR_RELATIONSHIP_OTHER,
} from "@/lib/contribute/relationshipOptions.js";

const relationshipErrorCopy = {
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
    body: "Please return to the invitation page and enter your name before choosing your relationship.",
  },
};

function ContributorNav({ backHref }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 sm:px-[50px] py-6">
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="" width={36} height={36} aria-hidden="true" />
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

function RelationshipErrorState({ status, inviteToken }) {
  const copy = relationshipErrorCopy[status] ?? relationshipErrorCopy.invalid;

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
            href={`/contribute/${inviteToken}`}
            className="mt-2 flex h-[56px] items-center justify-center rounded-full px-8 text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
          >
            Return to invitation
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function OptionCard({ label, isSelected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={() => onSelect(label)}
      className={`flex h-[115px] w-full items-center justify-center rounded-[20px] border px-6 text-center [font-family:var(--font-family-display)] text-2xl font-medium leading-[31px] transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus ${
        isSelected
          ? "border-[#97877B] bg-r-card text-r-text"
          : "border-[#97877B] bg-transparent text-r-text hover:bg-r-card/45"
      }`}
    >
      {label}
    </button>
  );
}

function getInitialSelection(relationshipType) {
  if (relationshipType === CONTRIBUTOR_RELATIONSHIP_FAMILY) return CONTRIBUTOR_RELATIONSHIP_FAMILY;
  if (relationshipType === CONTRIBUTOR_RELATIONSHIP_OTHER) return CONTRIBUTOR_RELATIONSHIP_OTHER;
  if (relationshipType === CONTRIBUTOR_RELATIONSHIP_FRIEND) return CONTRIBUTOR_RELATIONSHIP_FRIEND;
  if (relationshipType === CONTRIBUTOR_RELATIONSHIP_COLLEAGUE) return CONTRIBUTOR_RELATIONSHIP_COLLEAGUE;
  return "";
}

export default function RelationshipSelector({ inviteToken }) {
  const router = useRouter();
  const [draft, setDraft] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [familySubtype, setFamilySubtype] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      let relationshipDraft;

      try {
        relationshipDraft = await getContributorRelationshipDraft(inviteToken);
      } catch (err) {
        console.error("Failed to load contributor relationship draft.", err);
        relationshipDraft = { status: "error", invite: null, session: null };
      }

      if (!isMounted) return;

      setDraft(relationshipDraft);

      const relationshipType = relationshipDraft?.relationship_type ?? "";
      const relationshipLabel = relationshipDraft?.relationship_custom_label ?? "";

      setSelectedCategory(getInitialSelection(relationshipType));
      if (relationshipType === CONTRIBUTOR_RELATIONSHIP_FAMILY) {
        setFamilySubtype(relationshipLabel);
      }
      if (relationshipType === CONTRIBUTOR_RELATIONSHIP_OTHER) {
        setOtherLabel(relationshipLabel);
      }

      setIsLoading(false);
    }

    load();
    return () => { isMounted = false; };
  }, [inviteToken]);

  const isFamilyOpen = selectedCategory === CONTRIBUTOR_RELATIONSHIP_FAMILY;
  const isOtherOpen = selectedCategory === CONTRIBUTOR_RELATIONSHIP_OTHER;
  const isSubPanelOpen = isFamilyOpen || isOtherOpen;

  function handleTopLevelSelect(option) {
    setSelectedCategory(option);
    setError("");
    setSubmitError("");
  }

  function handleFamilySelect(subtype) {
    setFamilySubtype(subtype);
    setError("");
    setSubmitError("");
  }

  function handleOtherLabelChange(event) {
    setOtherLabel(event.target.value);
    setError("");
    setSubmitError("");
  }

  function handleReturnToTypes() {
    setSelectedCategory("");
    setError("");
    setSubmitError("");
  }

  async function handleContinue() {
    if (!selectedCategory) {
      setError("Please choose the relationship that fits best.");
      return;
    }

    if (isFamilyOpen && !familySubtype) {
      setError("Please choose how you're related.");
      return;
    }

    if (isOtherOpen && !otherLabel.trim()) {
      setError("Please describe your relationship.");
      return;
    }

    const relationshipLabel = isFamilyOpen
      ? familySubtype
      : isOtherOpen
        ? otherLabel.trim()
        : "";

    setIsSaving(true);
    setSubmitError("");

    try {
      await saveContributorRelationship(inviteToken, {
        relationshipType: selectedCategory,
        relationshipLabel,
      });
      router.push(`/contribute/${inviteToken}/questions`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "We could not save your relationship yet. Please try again.",
      );
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!draft || draft.status !== "ready") {
    return <RelationshipErrorState status={draft?.status ?? "invalid"} inviteToken={inviteToken} />;
  }

  const subjectName = draft.invite?.deceased?.name || "them";

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">
      <ContributorNav backHref={`/contribute/${inviteToken}/privacy`} />

      <div className="flex-1 px-6 sm:px-[50px] pt-6 pb-16">
        <div className="mx-auto flex w-full max-w-[886px] flex-col items-center pt-[101px] max-sm:pt-16">

          <div className="flex max-w-[507px] flex-col items-center gap-5 text-center mx-auto">
            <h1 className="[font-family:var(--font-family-display)] text-[40px] font-bold leading-[52px] text-r-text">
              Who were you to {subjectName}?
            </h1>
            <p className="text-xl leading-[26px] text-r-secondary">
              Select your connection to {subjectName} below.
            </p>
          </div>

          {!isSubPanelOpen ? (
            <div className="mt-[93px] grid w-full grid-cols-1 gap-x-5 gap-y-[10px] sm:grid-cols-2" role="radiogroup" aria-label="Your relationship">
              {CONTRIBUTOR_RELATIONSHIP_OPTIONS.map((option) => (
                <OptionCard
                  key={option}
                  label={option}
                  isSelected={selectedCategory === option}
                  onSelect={handleTopLevelSelect}
                />
              ))}
            </div>
          ) : null}

          {isFamilyOpen ? (
            <div className="mt-[93px] grid w-full grid-cols-1 gap-x-5 gap-y-[10px] sm:grid-cols-2" role="radiogroup" aria-label="Family relationship">
              {CONTRIBUTOR_FAMILY_RELATIONSHIP_OPTIONS.map((option) => (
                <OptionCard
                  key={option}
                  label={option}
                  isSelected={familySubtype === option}
                  onSelect={handleFamilySelect}
                />
              ))}
            </div>
          ) : null}

          {isOtherOpen ? (
            <div className="mx-auto mt-[93px] flex w-full max-w-[434px] flex-col">
              <label
                htmlFor="relationship-other-label"
                className="[font-family:var(--font-family-display)] text-2xl font-medium leading-[31px] text-r-text"
              >
                Relationship type
              </label>
              <input
                id="relationship-other-label"
                type="text"
                autoFocus
                value={otherLabel}
                onChange={handleOtherLabelChange}
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                placeholder="Type answer"
                aria-invalid={Boolean(error)}
                className={`mt-[10px] h-16 w-full rounded-[13px] border bg-transparent px-5 text-xl leading-[26px] text-r-text outline-none transition placeholder:text-r-secondary focus:border-r-border-focus ${
                  error ? "border-r-danger" : "border-[#97877B]"
                }`}
              />
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-center text-sm leading-5 text-r-danger" role="alert">{error}</p>
          ) : null}

          {submitError ? (
            <p className="mt-4 text-center text-sm leading-5 text-r-danger" role="alert">{submitError}</p>
          ) : null}

          <div
            className={`mx-auto grid w-full max-w-[886px] grid-cols-1 gap-5 sm:grid-cols-2 mt-[100px] ${
              !isSubPanelOpen ? "sm:flex sm:justify-center" : ""
            }`}
          >
            {isSubPanelOpen ? (
              <button
                type="button"
                onClick={handleReturnToTypes}
                disabled={isSaving}
                className="flex h-[62px] w-full max-w-[434px] items-center justify-center rounded-full bg-r-btn px-8 text-xl leading-[26px] text-r-btn-text transition hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus disabled:cursor-not-allowed disabled:opacity-55"
              >
                Return to relationship types
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleContinue}
              disabled={isSaving}
              className={`flex h-[62px] w-full max-w-[434px] items-center justify-center rounded-full bg-r-btn px-8 text-xl leading-[26px] text-r-btn-text transition hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus disabled:cursor-not-allowed disabled:opacity-55 ${
                !isSubPanelOpen ? "sm:col-span-2" : ""
              }`}
            >
              {isSaving ? "Saving..." : "Continue"}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}

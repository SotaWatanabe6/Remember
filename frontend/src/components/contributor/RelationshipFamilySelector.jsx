'use client';
// frontend/src/components/contributor/RelationshipFamilySelector.jsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getContributorRelationshipDraft,
  saveContributorRelationship,
} from "@/services/contributorService.js";
import {
  CONTRIBUTOR_RELATIONSHIP_FAMILY,
  CONTRIBUTOR_FAMILY_RELATIONSHIP_OPTIONS,
} from "@/lib/contribute/relationshipOptions.js";

const RELATIONSHIP_DRAFT_PREFIX = "remember_relationship_draft";

function getDraftKey(inviteToken) {
  return `${RELATIONSHIP_DRAFT_PREFIX}:${inviteToken}`;
}

function readRelationshipDraft(inviteToken) {
  try {
    return JSON.parse(localStorage.getItem(getDraftKey(inviteToken)) || "{}");
  } catch {
    return {};
  }
}

function writeRelationshipDraft(inviteToken, draft) {
  try {
    localStorage.setItem(getDraftKey(inviteToken), JSON.stringify(draft));
  } catch {}
}

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

export default function RelationshipFamilySelector({ inviteToken }) {
  const router = useRouter();
  const [subjectName, setSubjectName] = useState("them");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const relationshipDraft = await getContributorRelationshipDraft(inviteToken);
        if (!isMounted) return;
        if (relationshipDraft?.invite?.deceased?.name) {
          setSubjectName(relationshipDraft.invite.deceased.name);
        }
      } catch (err) {
        console.error("Failed to load contributor relationship draft.", err);
      }

      const localDraft = readRelationshipDraft(inviteToken);
      if (localDraft.relationship_type !== CONTRIBUTOR_RELATIONSHIP_FAMILY) {
        // No family selection in progress — send back to the main page.
        router.replace(`/contribute/${inviteToken}/relationship`);
        return;
      }
      if (isMounted) {
        setSelected(localDraft.relationship_label || "");
        setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [inviteToken, router]);

  function handleSelect(option) {
    setSelected(option);
    setError("");
    setSubmitError("");
  }

  async function handleContinue() {
    if (!selected) {
      setError("Please choose how you're related.");
      return;
    }

    setIsSaving(true);
    setSubmitError("");

    try {
      await saveContributorRelationship(inviteToken, {
        relationshipType: CONTRIBUTOR_RELATIONSHIP_FAMILY,
        relationshipLabel: selected,
      });
      writeRelationshipDraft(inviteToken, {});
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

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">
      <ContributorNav backHref={`/contribute/${inviteToken}/relationship`} />

      <div className="flex-1 px-6 sm:px-[50px] pt-6 pb-16">
        <div className="page-shell">

          <div className="text-center">
            <h1 className="text-h1 text-r-text">Who were you to {subjectName}?</h1>
            <p className="mt-2 text-body-2 text-r-secondary">Select your connection to {subjectName} below.</p>
          </div>

          <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Family relationship">
            {CONTRIBUTOR_FAMILY_RELATIONSHIP_OPTIONS.map((option) => {
              const isSelected = selected === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelect(option)}
                  className="flex h-[100px] items-center justify-center rounded-2xl text-xl font-display font-normal transition-colors sm:h-[120px]"
                  style={{
                    border: isSelected ? '2px solid var(--color-r-text)' : '1px solid var(--color-r-border)',
                    backgroundColor: isSelected ? 'var(--color-r-card)' : 'transparent',
                    color: 'var(--color-r-text)',
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {error ? (
            <p className="text-center text-caption text-r-danger" role="alert">{error}</p>
          ) : null}

          {submitError ? (
            <p className="text-center text-caption text-r-danger" role="alert">{submitError}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/contribute/${inviteToken}/relationship`}
              className="flex h-[56px] items-center justify-center rounded-full text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
            >
              Return to relationship types
            </Link>
            <button
              type="button"
              onClick={handleContinue}
              disabled={isSaving}
              className="flex h-[56px] items-center justify-center rounded-full text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-55 bg-r-btn text-r-btn-text border-none"
            >
              {isSaving ? "Saving..." : "Continue"}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}

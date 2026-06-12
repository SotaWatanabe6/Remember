"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getContributorRelationshipDraft,
  saveContributorRelationship,
} from "@/services/contributorService.js";
import {
  CONTRIBUTOR_RELATIONSHIP_FAMILY_OPTIONS,
  CONTRIBUTOR_RELATIONSHIP_OTHER,
  CONTRIBUTOR_RELATIONSHIP_TOP_LEVEL_OPTIONS,
} from "@/lib/contribute/relationshipOptions.js";

const RELATIONSHIP_FAMILY = "Family";

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

function ContributorBrand() {
  return (
    <Link href="/" className="flex items-center gap-5 text-r-text" aria-label="Remember home">
      <Image
        src="/images/remember-logo.png"
        alt=""
        width={34}
        height={36}
        className="h-9 w-[34px] object-contain"
        priority
      />
      <span className="[font-family:var(--font-family-display)] text-2xl font-medium leading-[31px]">
        Remember
      </span>
    </Link>
  );
}

function ContributorPageShell({ children, backHref }) {
  return (
    <main className="min-h-screen bg-r-bg px-6 py-8 text-r-text sm:px-[50px] sm:py-[50px]">
      <header className="flex h-10 items-center justify-between">
        <ContributorBrand />
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center gap-3 text-base leading-6 text-r-text transition-opacity hover:opacity-75"
          >
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={2} />
            Back
          </Link>
        ) : null}
      </header>
      {children}
    </main>
  );
}

function LoadingState() {
  return (
    <ContributorPageShell>
      <section className="mx-auto flex min-h-[calc(100vh-140px)] flex-col items-center justify-center gap-4 text-center" aria-live="polite">
        <div className="size-12 animate-spin rounded-full border-2 border-r-border border-t-r-text" />
        <p className="text-base leading-6 text-r-secondary">Opening your contribution...</p>
      </section>
    </ContributorPageShell>
  );
}

function RelationshipErrorState({ status, inviteToken }) {
  const copy = relationshipErrorCopy[status] ?? relationshipErrorCopy.invalid;

  return (
    <ContributorPageShell>
      <section className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-[560px] flex-col items-center justify-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-r-card text-2xl font-medium text-r-secondary">
          R
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="[font-family:var(--font-family-display)] text-[32px] font-bold leading-[38px] text-r-text sm:text-[40px] sm:leading-[52px]">
            {copy.title}
          </h1>
          <p className="text-base leading-7 text-r-secondary sm:text-xl sm:leading-8">
            {copy.body}
          </p>
        </div>
        {status === "missing" ? (
          <Link
            href={`/contribute/${inviteToken}/public-contributor`}
            className="mt-2 flex h-[62px] w-full max-w-[434px] items-center justify-center rounded-full bg-r-btn px-8 text-xl leading-[26px] text-r-text transition hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus"
          >
            Return to contribution privacy
          </Link>
        ) : null}
      </section>
    </ContributorPageShell>
  );
}

function RelationshipOption({ label, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(label)}
      aria-pressed={isSelected}
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

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`flex h-[62px] w-full max-w-[434px] items-center justify-center rounded-full bg-r-btn px-8 text-xl leading-[26px] text-r-text transition hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function getInitialCategory(relationshipType) {
  if (CONTRIBUTOR_RELATIONSHIP_FAMILY_OPTIONS.includes(relationshipType)) {
    return RELATIONSHIP_FAMILY;
  }

  if (CONTRIBUTOR_RELATIONSHIP_TOP_LEVEL_OPTIONS.includes(relationshipType)) {
    return relationshipType;
  }

  return "";
}

export default function RelationshipSelector({ inviteToken }) {
  const router = useRouter();
  const [draft, setDraft] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDraft() {
      setIsLoading(true);
      let relationshipDraft;

      try {
        relationshipDraft = await getContributorRelationshipDraft(inviteToken);
      } catch (error) {
        console.error("Failed to load contributor relationship draft.", error);
        relationshipDraft = {
          status: "error",
          invite: null,
          session: null,
        };
      }

      if (!isMounted) {
        return;
      }

      const initialRelationshipType = relationshipDraft?.relationship_type ?? "";

      setDraft(relationshipDraft);
      setRelationshipType(initialRelationshipType);
      setSelectedCategory(getInitialCategory(initialRelationshipType));
      setCustomLabel(relationshipDraft?.relationship_custom_label ?? "");
      setIsLoading(false);
    }

    loadDraft();

    return () => {
      isMounted = false;
    };
  }, [inviteToken]);

  const isFamilyOpen = selectedCategory === RELATIONSHIP_FAMILY;
  const isOtherOpen = selectedCategory === CONTRIBUTOR_RELATIONSHIP_OTHER;
  const isDirectRelationshipSelected =
    selectedCategory === "Friend" || selectedCategory === "Colleague";

  const headingName = draft?.invite?.deceased?.name ?? "";
  const firstName = useMemo(() => headingName.trim().split(/\s+/)[0] || headingName, [headingName]);

  const validate = () => {
    const nextErrors = {};

    if (!selectedCategory) {
      nextErrors.relationshipType = "Please choose the relationship that fits best.";
    }

    if (isFamilyOpen && !relationshipType) {
      nextErrors.relationshipType = "Please choose your family relationship.";
    }

    if (isOtherOpen && !customLabel.trim()) {
      nextErrors.customLabel = "Please share a short label for your relationship.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleTopLevelSelect = (relationship) => {
    setSelectedCategory(relationship);
    setErrors({});
    setSubmitError("");

    if (relationship === RELATIONSHIP_FAMILY) {
      setRelationshipType((current) =>
        CONTRIBUTOR_RELATIONSHIP_FAMILY_OPTIONS.includes(current) ? current : "",
      );
      setCustomLabel("");
      return;
    }

    if (relationship === CONTRIBUTOR_RELATIONSHIP_OTHER) {
      setRelationshipType(CONTRIBUTOR_RELATIONSHIP_OTHER);
      return;
    }

    setRelationshipType(relationship);
    setCustomLabel("");
  };

  const handleFamilySelect = (relationship) => {
    setRelationshipType(relationship);
    setErrors({});
    setSubmitError("");
  };

  const handleCustomLabelChange = (event) => {
    setCustomLabel(event.target.value);
    setErrors((current) => ({ ...current, customLabel: "" }));
    setSubmitError("");
  };

  const handleReturnToRelationshipTypes = () => {
    setSelectedCategory("");
    setRelationshipType("");
    setCustomLabel("");
    setErrors({});
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);
    setSubmitError("");

    try {
      await saveContributorRelationship(inviteToken, {
        relationshipType,
        relationshipCustomLabel: customLabel,
      });
      router.push(`/contribute/${inviteToken}/questions`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not save your relationship yet. Please try again.",
      );
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!draft || draft.status !== "ready") {
    return <RelationshipErrorState status={draft?.status ?? "invalid"} inviteToken={inviteToken} />;
  }

  return (
    <ContributorPageShell backHref={`/contribute/${inviteToken}/public-contributor`}>
      <section className="mx-auto flex w-full max-w-[886px] flex-col items-center pt-[101px] max-sm:pt-16">
        <div className="flex max-w-[507px] flex-col items-center gap-5 text-center">
          <h1 className="[font-family:var(--font-family-display)] text-[40px] font-bold leading-[52px] text-r-text">
            Who were you to {firstName}?
          </h1>
          <p className="text-xl leading-[26px] text-r-secondary">
            Select your connection to {firstName} below.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="w-full">
          {!isFamilyOpen && !isOtherOpen ? (
            <div className="relationship-panel mt-[93px] grid w-full grid-cols-1 gap-x-5 gap-y-[10px] sm:grid-cols-2">
              {CONTRIBUTOR_RELATIONSHIP_TOP_LEVEL_OPTIONS.map((relationship) => (
                <RelationshipOption
                  key={relationship}
                  label={relationship}
                  isSelected={selectedCategory === relationship}
                  onSelect={handleTopLevelSelect}
                />
              ))}
            </div>
          ) : null}

          {isFamilyOpen ? (
            <div className="relationship-panel mt-[93px] grid w-full grid-cols-1 gap-x-5 gap-y-[10px] sm:grid-cols-2">
              {CONTRIBUTOR_RELATIONSHIP_FAMILY_OPTIONS.map((relationship) => (
                <RelationshipOption
                  key={relationship}
                  label={relationship}
                  isSelected={relationshipType === relationship}
                  onSelect={handleFamilySelect}
                />
              ))}
            </div>
          ) : null}

          {isOtherOpen ? (
            <div className="relationship-panel mx-auto mt-[93px] flex w-full max-w-[434px] flex-col">
              <label
                htmlFor="contributor-relationship-custom"
                className="[font-family:var(--font-family-display)] text-2xl font-medium leading-[31px] text-r-text"
              >
                Relationship type
              </label>
              <input
                id="contributor-relationship-custom"
                name="relationshipCustomLabel"
                type="text"
                value={customLabel}
                onChange={handleCustomLabelChange}
                placeholder="Type answer"
                aria-invalid={Boolean(errors.customLabel)}
                aria-describedby={errors.customLabel ? "contributor-relationship-custom-error" : undefined}
                className={`mt-[10px] h-16 w-full rounded-[13px] border bg-transparent px-5 text-xl leading-[26px] text-r-text outline-none transition placeholder:text-r-secondary focus:border-r-border-focus ${
                  errors.customLabel ? "border-r-danger" : "border-[#97877B]"
                }`}
              />
              {errors.customLabel ? (
                <p id="contributor-relationship-custom-error" className="mt-2 text-sm leading-5 text-r-danger">
                  {errors.customLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          {errors.relationshipType ? (
            <p className="mt-4 text-center text-sm leading-5 text-r-danger">
              {errors.relationshipType}
            </p>
          ) : null}

          {submitError ? (
            <p className="mt-4 text-center text-sm leading-5 text-r-danger" role="alert">
              {submitError}
            </p>
          ) : null}

          <div
            className={`mx-auto grid w-full max-w-[886px] grid-cols-1 gap-5 sm:grid-cols-2 ${
              isFamilyOpen ? "mt-[100px]" : isOtherOpen ? "mt-[100px]" : "mt-[100px] sm:flex sm:justify-center"
            }`}
          >
            {isFamilyOpen || isOtherOpen ? (
              <PrimaryButton
                type="button"
                onClick={handleReturnToRelationshipTypes}
                disabled={isSaving}
              >
                Return to relationship types
              </PrimaryButton>
            ) : null}
            <PrimaryButton
              type="submit"
              disabled={isSaving || (!selectedCategory && !relationshipType)}
              className={!isFamilyOpen && !isOtherOpen ? "sm:col-span-2" : ""}
            >
              {isSaving ? "Saving..." : "Continue"}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <style jsx>{`
        .relationship-panel {
          animation: relationship-panel-in 180ms ease-out;
        }

        @keyframes relationship-panel-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </ContributorPageShell>
  );
}

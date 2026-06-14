"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getContributorRelationshipDraft,
  saveContributorRelationship,
} from "@/services/contributorService.js";
import {
  CONTRIBUTOR_RELATIONSHIP_OPTIONS,
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

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-r-bg px-6 py-10 text-neutral-950 sm:px-[50px]">
      <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <div className="size-12 rounded-full border-2 border-slate-200 border-t-neutral-950" />
        <p className="text-base leading-6 text-slate-600">Opening your contribution...</p>
      </section>
    </main>
  );
}

function RelationshipErrorState({ status, inviteToken }) {
  const copy = relationshipErrorCopy[status] ?? relationshipErrorCopy.invalid;

  return (
    <main className="flex min-h-screen items-center justify-center bg-r-bg px-6 py-10 text-neutral-950 sm:px-[50px]">
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
          <a
            href={`/contribute/${inviteToken}`}
            className="mt-2 flex h-[52px] items-center justify-center rounded-full bg-neutral-950 px-8 text-base font-bold leading-6 text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500"
          >
            Return to invitation
          </a>
        ) : null}
      </section>
    </main>
  );
}

function RelationshipOption({ relationship, isSelected, onSelect }) {
  return (
    <label
      className={`flex h-[86px] cursor-pointer items-center gap-5 rounded-[20px] border bg-white px-5 text-left transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-slate-500 sm:h-[100px] ${
        isSelected ? "border-neutral-950 shadow-sm" : "border-neutral-950/80 hover:border-neutral-950"
      }`}
    >
      <input
        type="radio"
        name="relationshipType"
        value={relationship}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        className={`flex size-[34px] shrink-0 items-center justify-center rounded-[5px] border sm:size-[43px] ${
          isSelected ? "border-neutral-950 bg-neutral-950" : "border-[#90a1b9] bg-white"
        }`}
        aria-hidden="true"
      >
        {isSelected ? (
          <span className="h-[14px] w-[8px] rotate-45 border-b-2 border-r-2 border-white" />
        ) : null}
      </span>
      <span className="text-base font-normal leading-6 text-neutral-950">{relationship}</span>
    </label>
  );
}

export default function RelationshipSelector({ inviteToken }) {
  const router = useRouter();
  const [draft, setDraft] = useState(null);
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

      setDraft(relationshipDraft);
      setRelationshipType(relationshipDraft?.relationship_type ?? "");
      setCustomLabel(relationshipDraft?.relationship_custom_label ?? "");
      setIsLoading(false);
    }

    loadDraft();

    return () => {
      isMounted = false;
    };
  }, [inviteToken]);

  const isOtherSelected = relationshipType === CONTRIBUTOR_RELATIONSHIP_OTHER;

  const validate = () => {
    const nextErrors = {};

    if (!relationshipType) {
      nextErrors.relationshipType = "Please choose the relationship that fits best.";
    }

    if (isOtherSelected && !customLabel.trim()) {
      nextErrors.customLabel = "Please share a short label for your relationship.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRelationshipChange = (eventOrRelationship) => {
    const nextRelationshipType =
      typeof eventOrRelationship === "string"
        ? eventOrRelationship
        : eventOrRelationship.target.value;

    setRelationshipType(nextRelationshipType);
    setErrors((current) => ({ ...current, relationshipType: "", customLabel: "" }));
    setSubmitError("");

    if (nextRelationshipType !== CONTRIBUTOR_RELATIONSHIP_OTHER) {
      setCustomLabel("");
    }
  };

  const handleCustomLabelChange = (event) => {
    setCustomLabel(event.target.value);
    setErrors((current) => ({ ...current, customLabel: "" }));
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

  const selectErrorId = errors.relationshipType ? "contributor-relationship-error" : undefined;
  const customErrorId = errors.customLabel ? "contributor-relationship-custom-error" : undefined;

  return (
    <main className="min-h-screen bg-r-bg px-6 py-8 text-neutral-950 sm:px-[50px] sm:py-[50px]">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1024px] flex-col items-center justify-center gap-8 sm:min-h-[calc(100vh-100px)]">
        <section className="flex w-full flex-col items-center gap-6 text-center">
          <div className="flex max-w-[640px] flex-col items-center gap-3">
            <h1 className="text-[30px] font-medium leading-9 text-neutral-950 sm:text-[36px] sm:leading-10">
              Your Relationship
            </h1>
            <p className="max-w-[512px] text-base leading-6 text-[#45556c]">
              Help us understand your connection to {draft.invite.deceased.name}.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex w-full flex-col items-stretch gap-4 text-left"
          >
            <fieldset
              aria-describedby={selectErrorId}
              className={`rounded-[20px] bg-[#f6f6f6] px-5 py-6 sm:px-10 sm:py-9 ${
                errors.relationshipType ? "ring-2 ring-red-200" : ""
              }`}
            >
              <legend className="sr-only">Your relationship</legend>
              <div
                className="grid grid-cols-1 gap-[10px] lg:grid-cols-2 lg:gap-x-[31px]"
                role="radiogroup"
                aria-invalid={Boolean(errors.relationshipType)}
              >
                {CONTRIBUTOR_RELATIONSHIP_OPTIONS.map((relationship) => (
                  <RelationshipOption
                    key={relationship}
                    relationship={relationship}
                    isSelected={relationshipType === relationship}
                    onSelect={handleRelationshipChange}
                  />
                ))}
              </div>
              {errors.relationshipType ? (
                <p
                  id="contributor-relationship-error"
                  className="mt-4 text-center text-sm leading-5 text-red-600"
                >
                  {errors.relationshipType}
                </p>
              ) : null}
            </fieldset>

            {isOtherSelected ? (
              <div className="mx-auto flex w-full max-w-[520px] flex-col gap-[10px]">
                <label
                  htmlFor="contributor-relationship-custom"
                  className="text-[17px] font-medium leading-[25px] text-neutral-950"
                >
                  Relationship label
                </label>
                <input
                  id="contributor-relationship-custom"
                  name="relationshipCustomLabel"
                  type="text"
                  value={customLabel}
                  onChange={handleCustomLabelChange}
                  placeholder="For example, former student"
                  aria-invalid={Boolean(errors.customLabel)}
                  aria-describedby={customErrorId}
                  className={`h-[63px] w-full rounded-[13px] border bg-white px-5 text-xl text-neutral-950 outline-none transition placeholder:text-neutral-950/50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
                    errors.customLabel ? "border-red-400" : "border-[#cad5e2]"
                  }`}
                />
                {errors.customLabel ? (
                  <p
                    id="contributor-relationship-custom-error"
                    className="text-sm leading-5 text-red-600"
                  >
                    {errors.customLabel}
                  </p>
                ) : null}
              </div>
            ) : null}

            {submitError ? (
              <p className="text-center text-sm leading-5 text-red-600" role="alert">
                {submitError}
              </p>
            ) : null}

            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push(`/contribute/${inviteToken}`)}
                disabled={isSaving}
                className="flex h-[52px] w-full items-center justify-center rounded-[20px] bg-[#cad5e2] px-8 text-base font-bold leading-6 text-white transition hover:bg-[#b7c5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex h-[52px] w-full items-center justify-center rounded-[20px] bg-neutral-950 px-8 text-base font-bold leading-6 text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {isSaving ? "Saving..." : "Continue"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

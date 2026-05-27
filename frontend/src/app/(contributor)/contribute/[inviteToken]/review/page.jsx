"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deletePhoto, deleteVoice } from "@/lib/api.js";
import {
  getContributorReviewDraft,
  submitContributorDraft,
} from "@/services/contributorService.js";

const reviewErrorCopy = {
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
    body: "Please return to the invitation page and enter your name before reviewing your memories.",
  },
  missing_data: {
    title: "This invitation is missing memorial details",
    body: "The invitation was found, but the memorial information is incomplete. Please ask the organizer to review the memorial and invitation.",
  },
  error: {
    title: "We could not open your review",
    body: "Something went wrong while loading your contribution. Please try again in a moment.",
  },
};

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span className="text-2xl leading-8 text-neutral-950">Remember</span>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-base text-neutral-950 transition-colors hover:text-slate-600"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <div className="size-12 rounded-full border-2 border-slate-200 border-t-neutral-950" />
        <p className="text-base leading-6 text-slate-600">Opening your review...</p>
      </section>
    </main>
  );
}

function ReviewErrorState({ status, inviteToken }) {
  const copy = reviewErrorCopy[status] ?? reviewErrorCopy.error;
  const href = status === "missing" ? `/contribute/${inviteToken}` : null;

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
        {href ? (
          <Link
            href={href}
            className="mt-2 flex h-[52px] items-center justify-center rounded-full bg-neutral-950 px-8 text-base font-bold leading-6 text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500"
          >
            Return to invitation
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatRelationship(contributor) {
  const relationshipType = contributor?.relationship_type;
  const relationshipLabel = contributor?.relationship_label;

  if (!relationshipType && !relationshipLabel) {
    return "Not provided";
  }

  if (relationshipType === "Other" && relationshipLabel) {
    return relationshipLabel;
  }

  return relationshipLabel || relationshipType;
}

function ReviewSection({ title, actionHref, actionLabel, children }) {
  return (
    <section className="rounded-[20px] border border-neutral-200 bg-white p-6 shadow-auth">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-medium leading-7 text-neutral-950">{title}</h2>
        {actionHref ? (
          <Link
            href={actionHref}
            className="shrink-0 text-sm font-medium leading-5 text-slate-600 transition-colors hover:text-neutral-950"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptySummary({ children }) {
  return <p className="text-sm leading-6 text-slate-500">{children}</p>;
}

export default function ReviewPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReview() {
      setIsLoading(true);
      try {
        const reviewDraft = await getContributorReviewDraft(inviteToken);
        if (isMounted) {
          setDraft(reviewDraft);
        }
      } catch {
        if (isMounted) {
          setDraft({ status: "error", invite: null, session: null, summary: null });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReview();

    return () => {
      isMounted = false;
    };
  }, [inviteToken]);

  async function handleDeletePhoto(assetId) {
    try {
      await deletePhoto(inviteToken, assetId);
      setDraft((currentDraft) => ({
        ...currentDraft,
        summary: {
          ...currentDraft.summary,
          photos: currentDraft.summary.photos.filter((photo) => photo.id !== assetId),
        },
      }));
    } catch {
      setSubmitError("We could not remove that photo. Please try again.");
    }
  }

  async function handleDeleteVoice(recordingId) {
    try {
      await deleteVoice(inviteToken, recordingId);
      setDraft((currentDraft) => ({
        ...currentDraft,
        summary: {
          ...currentDraft.summary,
          voice: currentDraft.summary.voice.filter((recording) => recording.id !== recordingId),
        },
      }));
    } catch {
      setSubmitError("We could not remove that recording. Please try again.");
    }
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await submitContributorDraft(inviteToken);
      router.push(`/contribute/${inviteToken}/submitted`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not submit your contribution. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!draft || draft.status !== "ready") {
    return <ReviewErrorState status={draft?.status ?? "error"} inviteToken={inviteToken} />;
  }

  const { invite, summary } = draft;
  const answerCount = summary.responses.filter((response) => response.response_text.trim()).length;
  const photoCount = summary.photos.length;
  const voiceCount = summary.voice.length;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-8">
        <ContributorNav backHref={`/contribute/${inviteToken}/voice`} />

        <header className="text-center">
          <h1 className="text-[40px] font-medium leading-tight text-neutral-950">
            Review contributions
          </h1>
          <p className="mx-auto mt-2 max-w-[512px] text-base leading-6 text-slate-500">
            Please review your contribution before submitting it for {invite.deceased.name}.
          </p>
        </header>

        <ReviewSection title="Contributor" actionHref={`/contribute/${inviteToken}/relationship`} actionLabel="Edit">
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium leading-6 text-neutral-950">
              {summary.contributor.name}
            </p>
            <p className="text-sm leading-6 text-slate-500">
              {formatRelationship(summary.contributor)}
            </p>
          </div>
        </ReviewSection>

        <ReviewSection title={`Questionnaire (${answerCount})`} actionHref={`/contribute/${inviteToken}/questions`} actionLabel="Edit">
          {answerCount > 0 ? (
            <div className="flex flex-col gap-4">
              {summary.responses.map((response) =>
                response.response_text.trim() ? (
                  <div key={response.question_text} className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-5 text-neutral-950">
                      {response.question_text}
                    </p>
                    <p className="text-sm leading-6 text-slate-500">{response.response_text}</p>
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            <EmptySummary>No questionnaire answers have been saved in this browser yet.</EmptySummary>
          )}
        </ReviewSection>

        <ReviewSection title={`Uploaded photos (${photoCount})`} actionHref={`/contribute/${inviteToken}/photos`} actionLabel={photoCount > 0 ? "Edit" : "Add"}>
          {photoCount > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {summary.photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                  {photo.previewUrl ? (
                    <Image
                      src={photo.previewUrl}
                      alt={photo.file_name}
                      fill
                      sizes="(min-width: 640px) 200px, 30vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-200 px-2 text-center text-xs text-slate-500">
                      {photo.file_name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-500 shadow-sm transition hover:bg-white hover:text-red-600"
                    aria-label={`Remove ${photo.file_name}`}
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptySummary>No photos have been added. You can submit without photos.</EmptySummary>
          )}
        </ReviewSection>

        <ReviewSection title={`Uploaded audio (${voiceCount})`} actionHref={`/contribute/${inviteToken}/voice`} actionLabel={voiceCount > 0 ? "Edit" : "Add"}>
          {voiceCount > 0 ? (
            <div className="flex flex-col gap-4">
              {summary.voice.map((recording) => (
                <div key={recording.id} className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-5 text-neutral-950">
                      {recording.contributor_title}
                    </p>
                    <p className="text-xs leading-5 text-slate-500">
                      {recording.file_name} - {formatDuration(recording.duration_seconds)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteVoice(recording.id)}
                    className="p-1.5 text-red-400 transition-colors hover:text-red-600"
                    aria-label={`Remove ${recording.contributor_title}`}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptySummary>No voice recordings have been added. You can submit without audio.</EmptySummary>
          )}
        </ReviewSection>

        <p className="text-center text-sm leading-6 text-slate-500">
          By submitting, you confirm that these memories may be shared with the memorial organizer
          and handled with care and respect.
        </p>

        {submitError ? (
          <p className="rounded-[13px] bg-red-50 px-4 py-3 text-center text-sm leading-5 text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={`/contribute/${inviteToken}/photos`}
            className="flex h-[56px] items-center justify-center rounded-full border border-neutral-200 text-base font-medium leading-6 text-neutral-950 transition-colors hover:bg-neutral-50"
          >
            Upload more
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex h-[56px] items-center justify-center rounded-full bg-neutral-950 text-base font-semibold leading-6 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {isSubmitting ? "Submitting..." : submitError ? "Retry submit" : "Submit"}
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  Loader2,
  Mic,
  Play,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteMemorialContributor,
  getMemorialContributorSubmission,
  getMemorialContributors,
  updateMemorialContributorStatus,
} from "@/services/contributorService";

function formatDate(value, fallback = "No date provided") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getContributorName(contributor) {
  const name = String(contributor?.name || "").trim();
  return name || "Anonymous";
}

function getRelationship(contributor) {
  return contributor?.relationship_label || contributor?.relationship_type || "No relationship";
}

function isAwaitingReview(contributor) {
  return String(contributor?.status || "").toLowerCase() === "submitted";
}

function getCountLabel(count) {
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
  return `${safeCount} contribution${safeCount === 1 ? "" : "s"}`;
}

function buildSearchText(contributor) {
  return [
    contributor?.name,
    contributor?.relationship_label,
    contributor?.relationship_type,
    contributor?.status,
  ].filter(Boolean).join(" ").toLowerCase();
}

function StatusBadge({ status }) {
  const key = String(status || "in_progress").toLowerCase();
  const label = key === "approved"
    ? "Approved"
    : key === "submitted"
      ? "Awaiting approval"
      : key === "rejected"
        ? "Rejected"
        : "In progress";
  const className = key === "approved"
    ? "bg-[#DCE3C6] text-[#5C6549]"
    : key === "submitted"
      ? "bg-[#F1D6C8] text-[#7A553F]"
      : key === "rejected"
        ? "bg-[#E7CBC6] text-[#794D45]"
        : "bg-[#E7E0D6] text-[#665E52]";

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full px-4 text-[13px] leading-4 ${className}`}>
      {label}
    </span>
  );
}

function TabLoading() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-r-border bg-r-card text-r-secondary">
      <Loader2 className="mr-3 animate-spin" size={22} />
      Loading contributors...
    </div>
  );
}

function TabError({ title, message, onRetry }) {
  return (
    <div className="rounded-[18px] border border-r-border bg-r-card px-8 py-10 text-center">
      <h3 className="text-[24px] leading-[28px] text-r-text [font-family:var(--font-family-display)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-[16px] leading-6 text-r-secondary">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-full bg-r-btn px-6 py-3 text-[15px] font-medium text-r-btn-text transition hover:opacity-85"
        >
          Try again
        </button>
      )}
    </div>
  );
}

function TabEmpty({ title, message }) {
  return (
    <div className="rounded-[18px] border border-r-border bg-r-card px-8 py-14 text-center">
      <h3 className="text-[24px] leading-[28px] text-r-text [font-family:var(--font-family-display)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-[16px] leading-6 text-r-secondary">{message}</p>
    </div>
  );
}

function SelectControl({ value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        onChange={onChange}
        value={value}
        className="h-[56px] w-full appearance-none rounded-[16px] border border-r-border bg-r-card px-5 pr-14 text-[20px] leading-[22px] text-r-text outline-none [font-family:var(--font-family-display)]"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-5 top-1/2 size-0 -translate-y-1/2 border-l-[9px] border-r-[9px] border-t-[14px] border-l-transparent border-r-transparent border-t-r-text" />
    </div>
  );
}

function ContributorCard({ contributor }) {
  return (
    <article className="min-h-[260px] rounded-[18px] border border-r-border bg-r-card px-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <h3 className="min-w-0 text-[28px] leading-[32px] text-r-text [font-family:var(--font-family-display)]">
          {getContributorName(contributor)}
        </h3>
        <StatusBadge status={contributor.status} />
      </div>
      <p className="mt-6 text-[16px] leading-[20px] text-r-secondary">
        {getCountLabel(contributor.contribution_count)}
      </p>
      <p className="mt-4 text-[16px] leading-[20px] text-r-secondary">
        Last submitted {formatDate(contributor.submitted_at)}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="inline-flex min-h-[44px] items-center justify-center rounded-[14px] bg-r-shape px-5 text-[15px] leading-[18px] text-[#FBF9F6]">
          {getRelationship(contributor)}
        </span>
        {Number(contributor.photo_count) > 0 && (
          <span className="inline-flex min-h-[44px] items-center rounded-[14px] bg-[#E9DED0] px-4 text-[14px] text-r-secondary">
            {contributor.photo_count} photos
          </span>
        )}
        {Number(contributor.voice_count) > 0 && (
          <span className="inline-flex min-h-[44px] items-center rounded-[14px] bg-[#E9DED0] px-4 text-[14px] text-r-secondary">
            {contributor.voice_count} voice
          </span>
        )}
      </div>
    </article>
  );
}

function ActionButtons({ disabled, onApprove, onDelete }) {
  return (
    <div className="flex items-center gap-6">
      <button
        type="button"
        disabled={disabled}
        onClick={onApprove}
        className="text-[#3F3A33] transition hover:opacity-70 disabled:opacity-30"
        aria-label="Approve submission"
      >
        <Check size={34} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-label="Delete submission"
        onClick={onDelete}
        className="text-[#C96E43] transition hover:opacity-70 disabled:opacity-30"
      >
        <Trash2 size={34} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function PhotoSection({ contributor, photos, submittedDate, actions }) {
  if (!photos.length) return null;

  return (
    <section className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-6 md:p-7">
      <div className="grid gap-7 lg:grid-cols-[260px_1fr]">
        <div className="flex items-start gap-4">
          <div className="mt-1 rounded-[4px] bg-[#4B463E] p-2 text-[#F6EFE7]">
            <ImageIcon size={24} />
          </div>
          <div>
            <p className="text-[16px] leading-[20px] text-[#5F5A52]">
              {getContributorName(contributor)} added {photos.length} photo{photos.length === 1 ? "" : "s"}
            </p>
            <p className="mt-3 text-[14px] leading-[18px] text-[#5F5A52]">Submitted {submittedDate}</p>
          </div>
        </div>

        <div>
          <div className="grid max-w-[620px] grid-cols-2 gap-4 sm:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="overflow-hidden rounded-[8px] bg-[#D8C8AF]">
                {photo.photo_url || photo.url ? (
                  <img
                    src={photo.photo_url || photo.url}
                    alt={photo.caption || photo.file_name || "Contributor photo"}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="aspect-square w-full" />
                )}
                {photo.caption && (
                  <figcaption className="px-3 py-2 text-[13px] leading-4 text-[#5F5A52]">{photo.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
          <div className="mt-6 flex justify-end">{actions}</div>
        </div>
      </div>
    </section>
  );
}

function VoiceSection({ contributor, voices, submittedDate, actions }) {
  if (!voices.length) return null;

  return (
    <section className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-6 md:p-7">
      <div className="grid gap-7 lg:grid-cols-[260px_1fr_auto]">
        <div className="flex items-start gap-4">
          <Mic className="mt-1 text-[#3F3A33]" size={28} />
          <div>
            <p className="text-[16px] leading-[20px] text-[#5F5A52]">
              {getContributorName(contributor)} added {voices.length} audio recording{voices.length === 1 ? "" : "s"}
            </p>
            <p className="mt-3 text-[14px] leading-[18px] text-[#5F5A52]">Submitted {submittedDate}</p>
          </div>
        </div>

        <div className="space-y-6">
          {voices.map((voice) => (
            <article key={voice.id}>
              <h3 className="text-[26px] leading-[30px] text-r-text [font-family:var(--font-family-display)]">
                {voice.contributor_title || voice.file_name || "Voice recording"}
              </h3>
              {voice.audio_url || voice.url ? (
                <audio controls src={voice.audio_url || voice.url} className="mt-4 w-full max-w-[520px]" />
              ) : (
                <div className="mt-4 flex items-center gap-5">
                  <span className="flex size-[48px] items-center justify-center rounded-full bg-[#3F3A33] text-[#F6EFE7]">
                    <Play size={20} fill="currentColor" />
                  </span>
                  <span className="text-[15px] text-[#5F5A52]">Audio preview unavailable</span>
                </div>
              )}
              {(voice.key_quote || voice.transcript_text) && (
                <p className="mt-5 max-w-[760px] text-[18px] italic leading-[28px] text-[#5F5A52]">
                  &quot;{voice.key_quote || voice.transcript_text}&quot;
                </p>
              )}
            </article>
          ))}
        </div>

        <div className="self-end">{actions}</div>
      </div>
    </section>
  );
}

function StorySection({ contributor, responses, submittedDate, actions }) {
  const answeredResponses = responses.filter((response) => String(response.response_text || "").trim());
  if (!answeredResponses.length) return null;

  return (
    <section className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-6 md:p-7">
      <div className="grid gap-7 lg:grid-cols-[260px_1fr_auto]">
        <div className="flex items-start gap-4">
          <FileText className="mt-1 text-[#3F3A33]" size={28} />
          <div>
            <p className="text-[16px] leading-[20px] text-[#5F5A52]">
              {getContributorName(contributor)} answered {answeredResponses.length} question{answeredResponses.length === 1 ? "" : "s"}
            </p>
            <p className="mt-3 text-[14px] leading-[18px] text-[#5F5A52]">Submitted {submittedDate}</p>
          </div>
        </div>

        <div className="space-y-6">
          {answeredResponses.slice(0, 4).map((response) => (
            <article key={response.id}>
              <h3 className="text-[24px] leading-[30px] text-r-text [font-family:var(--font-family-display)]">
                {response.question_text || "Story response"}
              </h3>
              <p className="mt-3 text-[18px] leading-[28px] text-[#5F5A52]">{response.response_text}</p>
            </article>
          ))}
          {answeredResponses.length > 4 && (
            <p className="text-[15px] leading-5 text-[#5F5A52]">
              {answeredResponses.length - 4} more response{answeredResponses.length - 4 === 1 ? "" : "s"} saved for generation.
            </p>
          )}
        </div>

        <div className="self-end">{actions}</div>
      </div>
    </section>
  );
}

function ApprovalDetail({
  contributor,
  detail,
  loading,
  error,
  actionPending,
  onApprove,
  onDelete,
  onRetry,
}) {
  if (!contributor) {
    return (
      <TabEmpty
        title="No contributions awaiting approval"
        message="Submitted memories will appear here before they are approved for generation."
      />
    );
  }

  if (loading) return <TabLoading />;

  if (error) {
    return (
      <TabError
        title="Unable to load this submission"
        message={error}
        onRetry={onRetry}
      />
    );
  }

  const currentContributor = detail?.contributor || contributor;
  const submittedDate = formatDate(currentContributor.submitted_at, "No date provided");
  const photos = detail?.photos || [];
  const responses = detail?.responses || [];
  const voices = detail?.voices || [];
  const actions = (
    <ActionButtons
      disabled={actionPending}
      onApprove={onApprove}
      onDelete={onDelete}
    />
  );
  const hasContent = photos.length || responses.length || voices.length;

  return (
    <div className="mx-auto flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <article className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[24px] leading-[28px] text-r-text [font-family:var(--font-family-display)]">
              {getContributorName(currentContributor)}
            </h2>
            <StatusBadge status={currentContributor.status} />
          </div>
          <p className="mt-4 text-[16px] leading-[20px] text-[#5F5A52]">
            {getCountLabel(currentContributor.contribution_count)}
          </p>
          <p className="mt-3 text-[16px] leading-[20px] text-[#5F5A52]">
            Last submitted {submittedDate}
          </p>
          <div className="mt-8 inline-flex min-h-[42px] min-w-[162px] items-center justify-center rounded-[12px] bg-[#B9C493] px-6 text-[12px] leading-[16px] text-[#4D523A]">
            {getRelationship(currentContributor)}
          </div>
        </article>

        <article className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-8">
          <div className="flex h-full flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <h3 className="text-[24px] leading-[28px] text-r-text [font-family:var(--font-family-display)]">
                Review submission
              </h3>
              <p className="mt-3 max-w-3xl text-[18px] leading-[28px] text-[#5F5A52]">
                Check the contributor&apos;s photos, voice recordings, and written memories before approving them for memorial generation.
              </p>
            </div>
            {actions}
          </div>
        </article>
      </div>

      {!hasContent && (
        <TabEmpty
          title="No saved memories in this submission"
          message="This contributor submitted, but no photos, stories, or voice recordings were found."
        />
      )}
      <PhotoSection contributor={currentContributor} photos={photos} submittedDate={submittedDate} actions={actions} />
      <VoiceSection contributor={currentContributor} voices={voices} submittedDate={submittedDate} actions={actions} />
      <StorySection contributor={currentContributor} responses={responses} submittedDate={submittedDate} actions={actions} />
    </div>
  );
}

export default function ContributionsPanel({
  memorialId,
  contributorslist,
  loading = false,
  error = null,
  onRetry,
  onContributorsChange,
  initialView = "contributors",
}) {
  const usesExternalContributors = Array.isArray(contributorslist);
  const [internalContributors, setInternalContributors] = useState([]);
  const [internalLoading, setInternalLoading] = useState(!usesExternalContributors);
  const [internalError, setInternalError] = useState(null);
  const [value, setValue] = useState(initialView);
  const [searchQuery, setSearchQuery] = useState("");
  const [contributorFilter, setContributorFilter] = useState("all");
  const [contributorSort, setContributorSort] = useState("recent");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submissionDetail, setSubmissionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [actionPending, setActionPending] = useState(false);

  const contributors = usesExternalContributors ? contributorslist : internalContributors;
  const isLoading = usesExternalContributors ? loading : internalLoading;
  const loadError = usesExternalContributors ? error : internalError;

  const setContributors = useCallback((updater) => {
    if (usesExternalContributors) {
      const next = typeof updater === "function" ? updater(contributors) : updater;
      onContributorsChange?.(next);
      return;
    }

    setInternalContributors(updater);
  }, [contributors, onContributorsChange, usesExternalContributors]);

  const loadContributors = useCallback(async () => {
    if (!memorialId || usesExternalContributors) return;

    setInternalLoading(true);
    setInternalError(null);

    try {
      const result = await getMemorialContributors(memorialId);
      setInternalContributors(result.contributors || []);
    } catch (loadContributorsError) {
      setInternalError(loadContributorsError instanceof Error ? loadContributorsError.message : "Failed to load contributors");
      setInternalContributors([]);
    } finally {
      setInternalLoading(false);
    }
  }, [memorialId, usesExternalContributors]);

  useEffect(() => {
    queueMicrotask(loadContributors);
  }, [loadContributors]);

  const contributorCards = useMemo(() => (
    [...contributors]
      .filter((contributor) => {
        const name = String(contributor.name || "").trim().toLowerCase();
        if (contributorFilter === "anonymous") return !name || name === "anonymous";
        if (contributorFilter === "named") return Boolean(name) && name !== "anonymous";
        if (contributorFilter === "awaiting") return isAwaitingReview(contributor);
        if (contributorFilter === "approved") return String(contributor.status || "").toLowerCase() === "approved";
        return true;
      })
      .sort((a, b) => {
        if (contributorSort === "name") return getContributorName(a).localeCompare(getContributorName(b));
        if (contributorSort === "count") return Number(b.contribution_count || 0) - Number(a.contribution_count || 0);
        return new Date(b.submitted_at || b.updated_at || b.created_at || 0) - new Date(a.submitted_at || a.updated_at || a.created_at || 0);
      })
  ), [contributorFilter, contributorSort, contributors]);

  const awaitingContributors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return contributors
      .filter(isAwaitingReview)
      .filter((contributor) => !query || buildSearchText(contributor).includes(query))
      .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
  }, [contributors, searchQuery]);

  const maxAwaitingIndex = Math.max(awaitingContributors.length - 1, 0);
  const activeIndex = Math.min(currentIndex, maxAwaitingIndex);
  const current = awaitingContributors[activeIndex] || null;
  const currentContributorId = current?.id || null;

  const loadSubmissionDetail = useCallback(async () => {
    if (!memorialId || !currentContributorId) {
      setSubmissionDetail(null);
      return;
    }

    setDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await getMemorialContributorSubmission(memorialId, currentContributorId);
      setSubmissionDetail(detail);
    } catch (submissionError) {
      setSubmissionDetail(null);
      setDetailError(submissionError instanceof Error ? submissionError.message : "Failed to load submission details");
    } finally {
      setDetailLoading(false);
    }
  }, [currentContributorId, memorialId]);

  useEffect(() => {
    if (value !== "awaiting") return;
    queueMicrotask(loadSubmissionDetail);
  }, [loadSubmissionDetail, value]);

  const retry = useCallback(() => {
    if (usesExternalContributors) {
      onRetry?.();
      return;
    }
    loadContributors();
  }, [loadContributors, onRetry, usesExternalContributors]);

  const handlePrev = () => setCurrentIndex((prev) => {
    if (!awaitingContributors.length) return 0;
    return prev === 0 ? awaitingContributors.length - 1 : prev - 1;
  });
  const handleNext = () => setCurrentIndex((prev) => {
    if (!awaitingContributors.length) return 0;
    return prev === awaitingContributors.length - 1 ? 0 : prev + 1;
  });

  const handleApprove = useCallback(async () => {
    if (!memorialId || !currentContributorId || actionPending) return;

    setActionPending(true);
    try {
      const result = await updateMemorialContributorStatus(memorialId, currentContributorId, "approved");
      setContributors((items) => items.map((item) => (
        item.id === currentContributorId ? { ...item, ...(result.contributor || {}), status: "approved" } : item
      )));
      setSubmissionDetail((detail) => detail ? {
        ...detail,
        contributor: { ...detail.contributor, ...(result.contributor || {}), status: "approved" },
      } : detail);
    } catch (approveError) {
      setDetailError(approveError instanceof Error ? approveError.message : "Failed to approve submission");
    } finally {
      setActionPending(false);
    }
  }, [actionPending, currentContributorId, memorialId, setContributors]);

  const handleDelete = useCallback(async () => {
    if (!memorialId || !currentContributorId || actionPending) return;

    const confirmed = window.confirm("Delete this contribution? This cannot be undone.");
    if (!confirmed) return;

    setActionPending(true);
    try {
      await deleteMemorialContributor(memorialId, currentContributorId);
      setContributors((items) => items.filter((item) => item.id !== currentContributorId));
      setSubmissionDetail(null);
    } catch (deleteError) {
      setDetailError(deleteError instanceof Error ? deleteError.message : "Failed to delete submission");
    } finally {
      setActionPending(false);
    }
  }, [actionPending, currentContributorId, memorialId, setContributors]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <SelectControl
            onChange={(event) => {
              setValue(event.target.value);
              setCurrentIndex(0);
            }}
            value={value}
            className="w-full lg:w-[360px]"
          >
            <option value="contributors">Contributors</option>
            <option value="awaiting">Awaiting approval</option>
          </SelectControl>

          {value === "contributors" && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <SelectControl
                value={contributorFilter}
                onChange={(event) => setContributorFilter(event.target.value)}
                className="w-full sm:w-[210px]"
              >
                <option value="all">Filter</option>
                <option value="named">Named</option>
                <option value="anonymous">Anonymous</option>
                <option value="awaiting">Awaiting approval</option>
                <option value="approved">Approved</option>
              </SelectControl>
              <SelectControl
                value={contributorSort}
                onChange={(event) => setContributorSort(event.target.value)}
                className="w-full sm:w-[210px]"
              >
                <option value="recent">Most recent</option>
                <option value="name">Name</option>
                <option value="count">Contribution count</option>
              </SelectControl>
            </div>
          )}
        </div>

        {value === "awaiting" && (
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex h-[56px] w-full max-w-[434px] items-center rounded-full border border-r-border bg-r-card px-6">
              <Search size={26} strokeWidth={1.8} className="text-r-text" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentIndex(0);
                }}
                placeholder="Search for a contributor"
                className="ml-5 w-full bg-transparent text-[18px] leading-[20px] text-r-secondary placeholder:text-r-muted outline-none"
              />
            </div>
            {awaitingContributors.length > 0 && (
              <div className="flex items-center gap-8 text-[22px] leading-[24px] text-r-text [font-family:var(--font-family-display)]">
                <button onClick={handlePrev} className="transition hover:opacity-70" aria-label="Previous submission">
                  <ChevronLeft size={46} strokeWidth={1.8} />
                </button>
                <span>{activeIndex + 1}/{awaitingContributors.length}</span>
                <button onClick={handleNext} className="transition hover:opacity-70" aria-label="Next submission">
                  <ChevronRight size={46} strokeWidth={1.8} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {value === "contributors" && isLoading && <TabLoading />}
      {value === "contributors" && !isLoading && loadError && (
        <TabError
          title="Unable to load contributors"
          message="Contributor details could not be loaded. You can still use the other tabs."
          onRetry={retry}
        />
      )}
      {value === "contributors" && !isLoading && !loadError && contributors.length === 0 && (
        <TabEmpty
          title="No contributors yet"
          message="Contributors will appear here once people begin sharing memories."
        />
      )}
      {value === "contributors" && !isLoading && !loadError && contributors.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {contributorCards.map((contributor) => (
            <ContributorCard key={contributor.id} contributor={contributor} />
          ))}
          {contributorCards.length === 0 && (
            <div className="col-span-full py-12 text-center text-[18px] text-r-secondary">
              No contributors match the current filter.
            </div>
          )}
        </div>
      )}

      {value === "awaiting" && isLoading && <TabLoading />}
      {value === "awaiting" && !isLoading && loadError && (
        <TabError
          title="Unable to load submissions"
          message="Submitted contributions could not be loaded right now."
          onRetry={retry}
        />
      )}
      {value === "awaiting" && !isLoading && !loadError && (
        <ApprovalDetail
          contributor={current}
          detail={submissionDetail}
          loading={detailLoading}
          error={detailError}
          actionPending={actionPending}
          onApprove={handleApprove}
          onDelete={handleDelete}
          onRetry={loadSubmissionDetail}
        />
      )}
    </div>
  );
}

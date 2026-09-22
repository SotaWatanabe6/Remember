"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteMemorialContributor,
  deleteContributorPhoto,
  deleteContributorVoice,
  deleteContributorResponse,
  deleteContributorStory,
  getMemorialContributorSubmission,
  getMemorialContributors,
  markMemorialContributorSubmissionReviewed,
  updateMemorialContributorStatus,
} from "@/services/contributorService";
import {
  getPendingSubmissionSections,
  getSubmissionSubTabs,
  isAwaitingReview,
  markSectionReviewed,
  resolveSubTab,
} from "@/lib/organizer/contributionReview";

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

function buildSearchText(contributor) {
  return [
    contributor?.name,
    contributor?.relationship_label,
    contributor?.relationship_type,
    contributor?.status,
  ].filter(Boolean).join(" ").toLowerCase();
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

function DeleteItemButton({ onDelete, label = "Delete" }) {
  return (
    <button
      type="button"
      onClick={onDelete}
      className="flex items-center gap-1.5 text-[13px] text-[#C96E43] transition hover:opacity-70"
      aria-label={label}
    >
      <Trash2 size={14} strokeWidth={2} />
      {label}
    </button>
  )
}

// Figma "archive_button" pill: outlined when idle, filled #9E9384 when active.
// NS-5: the "notif" dot (10px, #C16341, 8px after the label) marks a sub-tab
// that still holds items the organizer has not opened.
function SubTabPills({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-5" role="tablist" aria-label="Submission content">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex h-[50px] min-w-[160px] items-center justify-center rounded-full border border-r-muted px-7 text-[24px] italic leading-none transition [font-family:var(--font-family-display)] ${
              isActive ? "bg-[#9E9384] text-r-modal" : "text-r-muted hover:text-r-text"
            }`}
          >
            <span className="flex items-start gap-2">
              {tab.label}
              {tab.unreviewed && (
                <span
                  data-testid={`unreviewed-dot-${tab.key}`}
                  className="mt-[2px] block size-[10px] shrink-0 rounded-full bg-[#C16341]"
                >
                  <span className="sr-only">(has unreviewed items)</span>
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Figma "Awaiting Approval/Photos": 3-up grid of 3:2 tiles.
function PhotoSection({ photos, onDeletePhoto }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      {photos.map((photo) => (
        <figure key={photo.id} className="group overflow-hidden rounded-[8px] bg-[#D8C8AF]">
          {photo.photo_url || photo.url ? (
            <img
              src={photo.photo_url || photo.url}
              alt={photo.caption || photo.file_name || "Contributor photo"}
              className="aspect-[3/2] w-full object-cover"
            />
          ) : (
            <div className="aspect-[3/2] w-full" />
          )}
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <figcaption className="truncate text-[13px] leading-4 text-[#5F5A52]">{photo.caption || ""}</figcaption>
            <DeleteItemButton label="Remove" onDelete={() => onDeletePhoto?.(photo.id)} />
          </div>
        </figure>
      ))}
    </div>
  )
}

// Shared card shell for the Voice / Stories / Q&A sub-tabs (Figma bordered row).
function SubmissionCard({ title, date, children, onDelete }) {
  return (
    <article className="grid gap-6 rounded-[10px] border border-r-muted p-6 md:grid-cols-[250px_1fr] md:p-10">
      <div className="flex flex-col gap-2">
        <h3 className="text-[24px] leading-[28px] text-r-secondary [font-family:var(--font-family-display)]">{title}</h3>
        <p className="text-[12px] leading-4 text-r-secondary">{date}</p>
        <div className="mt-2">
          <DeleteItemButton label="Remove" onDelete={onDelete} />
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </article>
  );
}

function VoiceSection({ voices, submittedDate, onDeleteVoice }) {
  return (
    <div className="flex flex-col gap-5">
      {voices.map((voice) => (
        <SubmissionCard
          key={voice.id}
          title={voice.contributor_title || voice.file_name || "Voice recording"}
          date={formatDate(voice.created_at, submittedDate)}
          onDelete={() => onDeleteVoice?.(voice.id)}
        >
          {voice.audio_url || voice.url ? (
            <audio controls src={voice.audio_url || voice.url} className="w-full max-w-[600px]" />
          ) : (
            <div className="flex items-center gap-5">
              <span className="flex size-[48px] items-center justify-center rounded-full bg-[#3F3A33] text-[#F6EFE7]">
                <Play size={20} fill="currentColor" />
              </span>
              <span className="text-[15px] text-[#5F5A52]">Audio preview unavailable</span>
            </div>
          )}
          {(voice.key_quote || voice.transcript_text) && (
            <p className="mt-4 max-w-[760px] text-[18px] italic leading-[28px] text-[#5F5A52]">
              &quot;{voice.key_quote || voice.transcript_text}&quot;
            </p>
          )}
        </SubmissionCard>
      ))}
    </div>
  )
}

function StorySection({ stories, submittedDate, onDeleteStory }) {
  return (
    <div className="flex flex-col gap-5">
      {stories.map((story) => (
        <SubmissionCard
          key={story.id || story.client_story_id}
          title={story.title || "Untitled story"}
          date={formatDate(story.created_at, submittedDate)}
          onDelete={() => onDeleteStory?.(story.id)}
        >
          {story.body && (
            <p className="whitespace-pre-line text-[16px] leading-[24px] text-r-secondary">{story.body}</p>
          )}
        </SubmissionCard>
      ))}
    </div>
  );
}

function ResponsesSection({ responses, submittedDate, onDeleteResponse }) {
  return (
    <div className="flex flex-col gap-5">
      {responses.map((response) => (
        <SubmissionCard
          key={response.id}
          title={response.question_text || response.question_id || "Question"}
          date={formatDate(response.created_at, submittedDate)}
          onDelete={() => onDeleteResponse?.(response.id)}
        >
          <p className="text-[16px] leading-[24px] text-r-secondary">{response.answer_text}</p>
        </SubmissionCard>
      ))}
    </div>
  )
}

function ApprovalDetail({
  contributor,
  detail,
  loading,
  error,
  actionPending,
  searching = false,
  onApprove,
  onDelete,
  onDeletePhoto,
  onDeleteVoice,
  onDeleteResponse,
  onDeleteStory,
  onMarkReviewed,
  onRetry,
}) {
  const [requestedSubTab, setRequestedSubTab] = useState(null);

  // Computed before the early returns so the mark-reviewed effect can hook in.
  // NS-7: a content type only gets a sub-tab while it has something pending.
  const sections = getPendingSubmissionSections(detail);
  const subTabs = getSubmissionSubTabs(sections);
  const activeSubTab = resolveSubTab(requestedSubTab, subTabs);
  const activeTabUnreviewed = subTabs.some((tab) => tab.key === activeSubTab && tab.unreviewed);
  // `detail` can briefly belong to the previous contributor while the next one
  // loads, so only trust it once it names the contributor on screen.
  const detailIsCurrent = Boolean(contributor?.id) && detail?.contributor?.id === contributor.id;

  // NS-5: opening a sub-tab is what reviews its items, so the dot clears.
  useEffect(() => {
    if (loading || error || !detailIsCurrent || !activeSubTab || !activeTabUnreviewed) return;
    onMarkReviewed?.(activeSubTab);
  }, [activeSubTab, activeTabUnreviewed, detailIsCurrent, error, loading, onMarkReviewed]);

  if (!contributor) {
    // The tab itself is hidden when nothing is pending (NS-7), so an empty
    // list here means the search excluded every pending submission.
    return searching ? (
      <TabEmpty
        title="No pending submissions match your search"
        message="Clear the search to see every contribution awaiting approval."
      />
    ) : (
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
  const { photos, stories, voices, responses } = sections;

  return (
    <div className="flex flex-col gap-[30px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-[10px]">
          <h2 className="text-[36px] italic leading-none text-r-secondary [font-family:var(--font-family-display)]">
            {getContributorName(currentContributor)}
          </h2>
          <p className="text-[24px] leading-none text-r-text [font-family:var(--font-family-display)]">
            Submitted {submittedDate}
          </p>
        </div>
        <span className="inline-flex h-[50px] min-w-[207px] items-center justify-center rounded-[14px] bg-[#D9D9D9] px-6 text-[12px] leading-none text-r-text">
          {getRelationship(currentContributor)}
        </span>
      </div>

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        {subTabs.length > 0 ? (
          <SubTabPills tabs={subTabs} active={activeSubTab} onChange={setRequestedSubTab} />
        ) : <span />}
        <ActionButtons disabled={actionPending} onApprove={onApprove} onDelete={onDelete} />
      </div>

      {subTabs.length === 0 && (
        <TabEmpty
          title="No saved memories in this submission"
          message="This contributor submitted, but no photos, stories, or voice recordings were found."
        />
      )}
      {activeSubTab === "photos" && <PhotoSection photos={photos} onDeletePhoto={onDeletePhoto} />}
      {activeSubTab === "voices" && <VoiceSection voices={voices} submittedDate={submittedDate} onDeleteVoice={onDeleteVoice} />}
      {activeSubTab === "stories" && <StorySection stories={stories} submittedDate={submittedDate} onDeleteStory={onDeleteStory} />}
      {activeSubTab === "responses" && <ResponsesSection responses={responses} submittedDate={submittedDate} onDeleteResponse={onDeleteResponse} />}
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
}) {
  const usesExternalContributors = Array.isArray(contributorslist);
  const [internalContributors, setInternalContributors] = useState([]);
  const [internalLoading, setInternalLoading] = useState(!usesExternalContributors);
  const [internalError, setInternalError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
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
    queueMicrotask(loadSubmissionDetail);
  }, [loadSubmissionDetail]);

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

  const handleDeletePhoto = useCallback(async (assetId) => {
    if (!memorialId || !currentContributorId || actionPending) return
    const confirmed = window.confirm("Remove this photo? This cannot be undone.")
    if (!confirmed) return
    setActionPending(true)
    try {
      await deleteContributorPhoto(memorialId, currentContributorId, assetId)
      setSubmissionDetail((detail) => detail
        ? { ...detail, photos: detail.photos.filter((p) => p.id !== assetId) }
        : detail
      )
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to remove photo")
    } finally {
      setActionPending(false)
    }
  }, [actionPending, currentContributorId, memorialId])

  const handleDeleteVoice = useCallback(async (recordingId) => {
    if (!memorialId || !currentContributorId || actionPending) return
    const confirmed = window.confirm("Remove this voice recording? This cannot be undone.")
    if (!confirmed) return
    setActionPending(true)
    try {
      await deleteContributorVoice(memorialId, currentContributorId, recordingId)
      setSubmissionDetail((detail) => detail
        ? { ...detail, voices: detail.voices.filter((v) => v.id !== recordingId) }
        : detail
      )
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to remove voice recording")
    } finally {
      setActionPending(false)
    }
  }, [actionPending, currentContributorId, memorialId])

  const handleDeleteResponse = useCallback(async (responseId) => {
    if (!memorialId || !currentContributorId || actionPending) return
    const confirmed = window.confirm("Remove this response? This cannot be undone.")
    if (!confirmed) return
    setActionPending(true)
    try {
      await deleteContributorResponse(memorialId, currentContributorId, responseId)
      setSubmissionDetail((detail) => detail
        ? { ...detail, responses: detail.responses.filter((r) => r.id !== responseId) }
        : detail
      )
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to remove response")
    } finally {
      setActionPending(false)
    }
  }, [actionPending, currentContributorId, memorialId])

  const handleDeleteStory = useCallback(async (storyId) => {
    if (!memorialId || !currentContributorId || actionPending) return
    const confirmed = window.confirm("Remove this story? This cannot be undone.")
    if (!confirmed) return
    setActionPending(true)
    try {
      await deleteContributorStory(memorialId, currentContributorId, storyId)
      setSubmissionDetail((detail) => detail
        ? { ...detail, stories: detail.stories.filter((s) => s.id !== storyId) }
        : detail
      )
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to remove story")
    } finally {
      setActionPending(false)
    }
  }, [actionPending, currentContributorId, memorialId])

  const handleMarkReviewed = useCallback(async (type) => {
    if (!memorialId || !currentContributorId) return
    try {
      const result = await markMemorialContributorSubmissionReviewed(memorialId, currentContributorId, type)
      setSubmissionDetail((detail) => (
        detail?.contributor?.id === currentContributorId
          ? markSectionReviewed(detail, type, result?.reviewed_at || new Date().toISOString())
          : detail
      ))
    } catch {
      // Marking as reviewed is bookkeeping only; a failure just leaves the dot
      // in place, so it is not worth interrupting the review with an error.
    }
  }, [currentContributorId, memorialId])

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
    <div className="mx-auto flex max-w-7xl flex-col gap-[30px]">
      {/* Figma "contributor nav": search bar + 1/3 pager */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex h-[63px] w-full max-w-[432px] items-center rounded-[30px] border border-r-muted px-[30px]">
          <Search size={26} strokeWidth={1.8} className="text-r-text" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentIndex(0);
            }}
            placeholder="Search for contributor"
            className="ml-5 w-full bg-transparent text-[20px] leading-none text-r-secondary placeholder:text-r-secondary outline-none"
          />
        </div>
        {awaitingContributors.length > 0 && (
          <div className="flex w-[206px] items-center justify-between text-[24px] leading-none text-r-text [font-family:var(--font-family-display)]">
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

      {isLoading && <TabLoading />}
      {!isLoading && loadError && (
        <TabError
          title="Unable to load submissions"
          message="Submitted contributions could not be loaded right now."
          onRetry={retry}
        />
      )}
      {!isLoading && !loadError && (
        <ApprovalDetail
          key={currentContributorId || "none"}
          contributor={current}
          detail={submissionDetail}
          loading={detailLoading}
          error={detailError}
          actionPending={actionPending}
          searching={Boolean(searchQuery.trim())}
          onApprove={handleApprove}
          onDelete={handleDelete}
          onDeletePhoto={handleDeletePhoto}
          onDeleteVoice={handleDeleteVoice}
          onDeleteResponse={handleDeleteResponse}
          onDeleteStory={handleDeleteStory}
          onMarkReviewed={handleMarkReviewed}
          onRetry={loadSubmissionDetail}
        />
      )}
    </div>
  );
}

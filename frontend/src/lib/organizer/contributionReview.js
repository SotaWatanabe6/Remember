// Organizer management always shows Archive and Approve Contributions.
// Submission sub-tabs still depend on the content awaiting review.

export const ARCHIVE_TAB = "Archive";
export const APPROVE_TAB = "Approve Contributions";

const ALL_MANAGE_TABS = [ARCHIVE_TAB, APPROVE_TAB];

// Sub-tabs of a submission, in the order Figma shows them. Q&A is not in the
// approval wireframes but the organizer still needs to review answers before
// approving, so it stays as a fourth pill using the Archive tab's label.
// `noun` is how the approval modal names the content ("Approve photo
// submissions for memorial?"), following the Figma approve dialogs.
export const SUBMISSION_SUB_TABS = [
  { key: "photos", label: "Photos", noun: "photo" },
  { key: "voices", label: "Voice", noun: "audio" },
  { key: "stories", label: "Stories", noun: "story" },
  { key: "responses", label: "Q&A", noun: "Q&A" },
];

export function getSubTabNoun(key) {
  return SUBMISSION_SUB_TABS.find((tab) => tab.key === key)?.noun || "";
}

export function isAwaitingReview(contributor) {
  if (contributor?.moderation_resolution === "excluded" || contributor?.status === "rejected") return false;
  return String(contributor?.status || "").toLowerCase() === "submitted" || contributor?.moderation_pending > 0 || Boolean(contributor?.is_flagged && !contributor?.moderation_resolution);
}

export function hasPendingContributions(contributors) {
  return Array.isArray(contributors) && contributors.some(isAwaitingReview);
}

export function getManageTabs() {
  return [...ALL_MANAGE_TABS];
}

export function resolveManageTab(requestedTab, tabs) {
  return tabs.includes(requestedTab) ? requestedTab : ARCHIVE_TAB;
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

// NS-5: approval is per content type, so an approved item has left the queue
// even while the rest of the submission is still awaiting review.
export function isApproved(item) {
  return Boolean(item?.approved_at);
}

// Per content type, the items that are actually pending in a submission.
// Approved items are done with; empty drafts (a story with no title or body,
// a response with no answer) were never pending content. Either way their
// sub-tab is hidden once nothing of that type is left.
export function getPendingSubmissionSections(detail) {
  const pending = (items) => (Array.isArray(items) ? items : []).filter((item) => !isApproved(item) && item.moderation_resolution !== "excluded");

  return {
    photos: pending(detail?.photos),
    voices: pending(detail?.voices),
    stories: pending(detail?.stories).filter(
      (story) => hasText(story?.title) || hasText(story?.body),
    ),
    responses: pending(detail?.responses).filter(
      (response) => hasText(response?.answer_text),
    ),
  };
}

// NS-5: an item is unreviewed until the organizer has acted on its content
// type — approving the submission, or deleting from that type. Opening a
// sub-tab is not review, so a glance never clears the dot.
export function isUnreviewed(item) {
  return !item?.reviewed_at;
}

export function hasUnreviewedItems(items) {
  return Array.isArray(items) && items.some(isUnreviewed);
}

// Each visible sub-tab carries `unreviewed` so the pill can show its red dot.
export function getSubmissionSubTabs(sections) {
  return SUBMISSION_SUB_TABS
    .filter((tab) => (sections[tab.key] || []).length > 0)
    .map((tab) => ({ ...tab, unreviewed: hasUnreviewedItems(sections[tab.key]) }));
}

// Local mirror of the server's stamping on approve/delete: settle every
// unreviewed item of one type so the dot clears without a refetch.
// [[markSectionApproved]] does the same for approval.
export function markSectionReviewed(detail, type, reviewedAt) {
  if (!detail || !Array.isArray(detail[type])) return detail;
  return {
    ...detail,
    [type]: detail[type].map((item) => (isUnreviewed(item) ? { ...item, reviewed_at: reviewedAt } : item)),
  };
}

export function resolveSubTab(requestedKey, subTabs) {
  if (subTabs.some((tab) => tab.key === requestedKey)) return requestedKey;
  return subTabs[0]?.key || null;
}

// Local mirror of the per-type approve: approved items leave the queue, which
// also settles their dot. NS-6: with a selection, the server says which items
// it approved and which unselected ones it deleted; without one, the whole
// type was approved.
export function markSectionApproved(detail, type, approvedAt, { approvedIds, deletedIds = [] } = {}) {
  if (!detail || !Array.isArray(detail[type])) return detail;
  const approved = approvedIds ? new Set(approvedIds) : null;
  const deleted = new Set(deletedIds);
  return {
    ...detail,
    [type]: detail[type]
      .filter((item) => !deleted.has(item.id))
      .map((item) => (isApproved(item) || (approved && !approved.has(item.id))
        ? item
        : { ...item, approved_at: approvedAt, reviewed_at: item.reviewed_at || approvedAt })),
  };
}

// NS-6: every item starts selected, so nothing is deleted unless the
// organizer unticks it. Selection state is the ids unticked, per type.
export function getSelectedIds(items, unselected, type) {
  const unticked = new Set(unselected?.[type] || []);
  return (items || []).map((item) => item.id).filter((id) => !unticked.has(id));
}

export function toggleSelected(unselected, type, id) {
  const unticked = unselected?.[type] || [];
  return {
    ...unselected,
    [type]: unticked.includes(id) ? unticked.filter((item) => item !== id) : [...unticked, id],
  };
}

export function setAllSelected(unselected, type, items, selected) {
  return { ...unselected, [type]: selected ? [] : (items || []).map((item) => item.id) };
}

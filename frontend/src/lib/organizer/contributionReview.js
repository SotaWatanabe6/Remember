// Visibility rules for the organizer's contribution review (NS-7).
//
// The Approve Contributions tab — and each content-type sub-tab inside a
// submission — only exists while there is something pending review. Same idea
// as US-24 (hide the Voices output tab when there are no recordings), applied
// to the whole tab plus each of its sub-tabs.

export const ARCHIVE_TAB = "Archive";
export const APPROVE_TAB = "Approve Contributions";
export const OUTPUTS_TAB = "Outputs";

const ALL_MANAGE_TABS = [ARCHIVE_TAB, APPROVE_TAB, OUTPUTS_TAB];

// Sub-tabs of a submission, in the order Figma shows them. Q&A is not in the
// approval wireframes but the organizer still needs to review answers before
// approving, so it stays as a fourth pill using the Archive tab's label.
export const SUBMISSION_SUB_TABS = [
  { key: "photos", label: "Photos" },
  { key: "voices", label: "Voice" },
  { key: "stories", label: "Stories" },
  { key: "responses", label: "Q&A" },
];

export function isAwaitingReview(contributor) {
  return String(contributor?.status || "").toLowerCase() === "submitted";
}

export function hasPendingContributions(contributors) {
  return Array.isArray(contributors) && contributors.some(isAwaitingReview);
}

// Top-level tabs on the manage page. Approve Contributions disappears as soon
// as no contributor is awaiting review.
export function getManageTabs(contributors) {
  return hasPendingContributions(contributors)
    ? ALL_MANAGE_TABS
    : ALL_MANAGE_TABS.filter((tab) => tab !== APPROVE_TAB);
}

export function resolveManageTab(requestedTab, tabs) {
  return tabs.includes(requestedTab) ? requestedTab : ARCHIVE_TAB;
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

// Per content type, the items that are actually pending in a submission.
// Empty drafts (a story with no title or body, a response with no answer)
// are not pending content, so their sub-tab is hidden too.
export function getPendingSubmissionSections(detail) {
  return {
    photos: Array.isArray(detail?.photos) ? detail.photos : [],
    voices: Array.isArray(detail?.voices) ? detail.voices : [],
    stories: (Array.isArray(detail?.stories) ? detail.stories : []).filter(
      (story) => hasText(story?.title) || hasText(story?.body),
    ),
    responses: (Array.isArray(detail?.responses) ? detail.responses : []).filter(
      (response) => hasText(response?.answer_text),
    ),
  };
}

export function getSubmissionSubTabs(sections) {
  return SUBMISSION_SUB_TABS.filter((tab) => (sections[tab.key] || []).length > 0);
}

export function resolveSubTab(requestedKey, subTabs) {
  if (subTabs.some((tab) => tab.key === requestedKey)) return requestedKey;
  return subTabs[0]?.key || null;
}

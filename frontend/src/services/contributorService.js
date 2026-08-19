import {
  ApiRequestError,
  getAuthToken,
  getInviteToken,
  getContributorSummary,
  getResponses,
  savePrivacyChoice,
  saveRelationship,
  saveResponses,
  startContribution,
  submitContribution,
} from "@/lib/api.js";
import {
  CONTRIBUTOR_RELATIONSHIP_OPTIONS,
  CONTRIBUTOR_RELATIONSHIP_TYPES_REQUIRING_LABEL,
} from "@/lib/contribute/relationshipOptions.js";
import { getQuestionSetForContributorRelationship } from "@/lib/contribute/questionnaireQuestions.js";

const CONTRIBUTOR_SESSION_STORAGE_PREFIX = "remember_contributor_session";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getSessionStorageKey(inviteToken) {
  return `${CONTRIBUTOR_SESSION_STORAGE_PREFIX}:${inviteToken}`;
}

function getStoredContributorSession(inviteToken) {
  if (typeof window === "undefined") {
    return null;
  }

  let storedSession;

  try {
    storedSession = window.localStorage.getItem(getSessionStorageKey(inviteToken));
  } catch (error) {
    console.warn("Unable to load contributor session.", error);
    return null;
  }

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession);
  } catch (error) {
    console.warn("Discarding invalid contributor session.", error);
    try {
      window.localStorage.removeItem(getSessionStorageKey(inviteToken));
    } catch (storageError) {
      console.warn("Unable to clear invalid contributor session.", storageError);
    }
    return null;
  }
}

function storeContributorSession(inviteToken, session) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getSessionStorageKey(inviteToken), JSON.stringify(session));
  } catch (error) {
    console.warn("Unable to store contributor session.", error);
  }
}

function isMockContributorSession(session) {
  return (
    session?.contributorToken === "mock-contributor-session-token" ||
    session?.contributorId === "c1b2c3d4-0000-0000-0000-000000000001"
  );
}

function getInviteStatus(invite) {
  const inviteRecord = invite?.invite;

  if (!inviteRecord) {
    return "invalid";
  }

  if (!invite?.memorial) {
    return "missing_data";
  }

  if (inviteRecord.is_active === false) {
    return "closed";
  }

  return "valid";
}

function getDeceasedName(memorial) {
  return memorial?.subject_name || "";
}

function getDeceasedPhotoUrl(memorial) {
  return memorial?.cover_photo_url || null;
}

function getInviteUnavailableStatus(error) {
  const message = error.message.toLowerCase();

  if (message.includes("expired")) {
    return "expired";
  }

  return "closed";
}

function getInviteErrorStatus(error) {
  if (!(error instanceof ApiRequestError)) {
    return "error";
  }

  if (error.status === 404 || error.code === "not_found") {
    return "invalid";
  }

  if (error.status === 410) {
    return getInviteUnavailableStatus(error);
  }

  if (error.code === "network_error" || error.code === "configuration_error") {
    return "network_error";
  }

  return "error";
}

function normalizeInvite(inviteToken, invite, status) {
  const memorial = invite?.memorial ?? null;
  const inviteRecord = invite?.invite ?? null;
  const memorialId = memorial?.id ?? "";
  const deceasedName = getDeceasedName(memorial);

  if (status === "missing_data" || (status === "valid" && (!memorialId || !deceasedName))) {
    return {
      inviteToken,
      memorialId,
      status: "missing_data",
      deceased: {
        name: deceasedName,
        photoUrl: getDeceasedPhotoUrl(memorial),
      },
      memorial,
      invite: inviteRecord,
    };
  }

  return {
    inviteToken,
    memorialId,
    status,
    deceased: {
      name: deceasedName,
      photoUrl: getDeceasedPhotoUrl(memorial),
    },
    memorial,
    invite: inviteRecord,
  };
}

function normalizeStartContributionResponse(response, invite, contributorName) {
  const contributor = response?.contributor ?? response?.data?.contributor ?? null;
  const contributorToken =
    response?.contributor_token ??
    response?.contributorToken ??
    response?.token ??
    response?.data?.contributor_token ??
    contributor?.contributor_token ??
    contributor?.token ??
    contributor?.id ??
    "";
  const contributorId = contributor?.id ?? response?.contributor_id ?? response?.data?.contributor_id ?? "";

  if (!contributorId || !contributorToken) {
    return null;
  }

  return {
    contributor,
    contributorId,
    contributorToken,
    memorialId: contributor?.memorial_id ?? response?.memorial_id ?? invite.memorialId,
    contributorName: contributor?.name ?? contributorName,
    status: contributor?.status ?? "in_progress",
  };
}

const inviteValidationCache = new Map();
const INVITE_CACHE_TTL_MS = 60_000;

export function clearContributorInviteCache(inviteToken) {
  if (inviteToken) {
    inviteValidationCache.delete(inviteToken);
    return;
  }
  inviteValidationCache.clear();
}

export async function validateContributorInvite(inviteToken) {
  const cached = inviteValidationCache.get(inviteToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const invite = await getInviteToken(inviteToken);
    const status = getInviteStatus(invite);
    const value = normalizeInvite(inviteToken, invite, status);
    inviteValidationCache.set(inviteToken, {
      value,
      expiresAt: Date.now() + INVITE_CACHE_TTL_MS,
    });
    return value;
  } catch (error) {
    return {
      inviteToken,
      memorialId: "",
      status: getInviteErrorStatus(error),
      deceased: {
        name: "",
        photoUrl: null,
      },
      memorial: null,
      invite: null,
    };
  }
}

export async function beginContributorDraft(inviteToken, contributorName) {
  const trimmedContributorName = contributorName.trim();

  if (!trimmedContributorName) {
    throw new Error("Please enter your name.");
  }

  const invite = await validateContributorInvite(inviteToken);

  if (invite.status !== "valid") {
    throw new Error("This invitation is no longer available.");
  }

  const now = new Date().toISOString();
  const storedSession = getStoredContributorSession(inviteToken);

  if (
    storedSession?.contributorId &&
    storedSession.memorialId === invite.memorialId &&
    !isMockContributorSession(storedSession)
  ) {
    const resumedSession = {
      ...storedSession,
      inviteToken,
      memorialId: invite.memorialId,
      contributorName: trimmedContributorName,
      // Backfill the deceased's name/photo onto the session so the
      // questionnaire's localStorage-only fast path (getContributorQuestionnaireDraft)
      // can resolve invite.deceased.name without a network call.
      deceasedName: invite.deceased.name || storedSession.deceasedName || "",
      deceasedPhotoUrl: invite.deceased.photoUrl ?? storedSession.deceasedPhotoUrl ?? null,
      updatedAt: now,
    };

    storeContributorSession(inviteToken, resumedSession);
    return resumedSession;
  }

  let startedContribution;

  try {
    startedContribution = await startContribution(inviteToken, trimmedContributorName);
  } catch (error) {
    console.error("Failed to start contributor session.", error);
    throw new Error("We could not begin your contribution. Please try again.");
  }

  const contribution = normalizeStartContributionResponse(
    startedContribution,
    invite,
    trimmedContributorName,
  );

  if (!contribution) {
    console.error("Unexpected contributor start response.", startedContribution);
    throw new Error("The Remember API did not return a contributor session.");
  }

  const session = {
    inviteToken,
    memorialId: contribution.memorialId,
    contributorId: contribution.contributorId,
    contributorToken: contribution.contributorToken,
    contributorName: contribution.contributorName,
    status: contribution.status,
    // Persist the deceased's name/photo so the questionnaire's localStorage-only
    // fast path (getContributorQuestionnaireDraft) can resolve invite.deceased.name
    // without a network call.
    deceasedName: invite.deceased.name || "",
    deceasedPhotoUrl: invite.deceased.photoUrl ?? null,
    createdAt: now,
    updatedAt: now,
  };

  storeContributorSession(inviteToken, session);
  return session;
}

function hasValidContributorSession(session, invite) {
  return Boolean(
    session?.contributorId &&
      session?.contributorToken &&
      session?.memorialId &&
      session.memorialId === invite.memorialId &&
      !isMockContributorSession(session),
  );
}

function hasCompletedRelationship(session) {
  if (!session?.relationship_type) {
    return false;
  }

  if (CONTRIBUTOR_RELATIONSHIP_TYPES_REQUIRING_LABEL.has(session.relationship_type)) {
    return Boolean(session.relationship_custom_label);
  }

  return true;
}

export async function getContributorRelationshipDraft(inviteToken) {
  let invite;

  try {
    invite = await validateContributorInvite(inviteToken);
  } catch (error) {
    console.error("Failed to load contributor invite.", error);
    return {
      status: "error",
      invite: null,
      session: null,
    };
  }

  if (invite.status !== "valid") {
    return {
      status: invite.status,
      invite,
      session: null,
    };
  }

  const session = getStoredContributorSession(inviteToken);

  if (!hasValidContributorSession(session, invite)) {
    return {
      status: "missing",
      invite,
      session: null,
    };
  }

  return {
    status: "ready",
    invite,
    session,
    relationship_type: session.relationship_type ?? "",
    relationship_custom_label: session.relationship_custom_label ?? "",
  };
}

export async function getContributorPrivacyDraft(inviteToken) {
  const draft = await getContributorRelationshipDraft(inviteToken);

  return {
    ...draft,
    is_anonymous: draft.session?.is_anonymous ?? null,
  };
}

export async function saveContributorPrivacy(inviteToken, isAnonymous) {
  const draft = await getContributorRelationshipDraft(inviteToken);

  if (draft.status !== "ready") {
    throw new Error("Your contribution could not be found.");
  }

  try {
    await savePrivacyChoice(inviteToken, {
      contributor_token: draft.session.contributorToken,
      is_anonymous: isAnonymous,
    });
  } catch (error) {
    console.error("Failed to save contributor privacy choice.", error);
    throw new Error("We could not save your choice yet. Please try again.");
  }

  const updatedSession = {
    ...draft.session,
    // Only the flag is stored: the contributor's real name stays on the session
    // (and on the contributors row) so the organizer-facing record keeps it, and
    // the "Anonymous" credit is applied server-side when the memorial is built.
    is_anonymous: isAnonymous,
    updatedAt: new Date().toISOString(),
  };

  storeContributorSession(inviteToken, updatedSession);
  return updatedSession;
}

export async function saveContributorRelationship(
  inviteToken,
  { relationshipType, relationshipLabel = "" },
) {
  const trimmedRelationshipType = relationshipType.trim();
  const trimmedLabel = relationshipLabel.trim();

  if (!CONTRIBUTOR_RELATIONSHIP_OPTIONS.includes(trimmedRelationshipType)) {
    throw new Error("Please choose a relationship.");
  }

  if (CONTRIBUTOR_RELATIONSHIP_TYPES_REQUIRING_LABEL.has(trimmedRelationshipType) && !trimmedLabel) {
    throw new Error(
      trimmedRelationshipType === "Family"
        ? "Please choose how you're related."
        : "Please describe your relationship.",
    );
  }

  const draft = await getContributorRelationshipDraft(inviteToken);

  if (draft.status !== "ready") {
    throw new Error("Your contribution could not be found.");
  }

  const relationship_label = trimmedLabel || null;

  let savedRelationship;

  try {
    savedRelationship = await saveRelationship(inviteToken, {
      contributor_token: draft.session.contributorToken,
      relationship_type: trimmedRelationshipType,
      relationship_label,
    });
  } catch (error) {
    console.error("Failed to save contributor relationship.", error);
    throw new Error("We could not save your relationship yet. Please try again.");
  }

  const updatedSession = {
    ...draft.session,
    relationship_type: savedRelationship?.contributor?.relationship_type ?? trimmedRelationshipType,
    relationship_custom_label: relationship_label,
    relationship_label,
    updatedAt: new Date().toISOString(),
  };

  storeContributorSession(inviteToken, updatedSession);
  return updatedSession;
}

export async function getContributorQuestionnaireDraft(inviteToken) {
  // Check localStorage first — skip the network call on every autosave.
  // The session was already validated when the contributor started their draft.
  const session = getStoredContributorSession(inviteToken);

  if (
    session?.contributorId &&
    session?.contributorToken &&
    session?.memorialId &&
    !isMockContributorSession(session)
  ) {
    // Build a minimal invite object from session data — no network needed
    const invite = {
      inviteToken,
      memorialId: session.memorialId,
      status: 'valid',
      deceased: {
        name: session.deceasedName ?? '',
        photoUrl: session.deceasedPhotoUrl ?? null,
      },
      memorial: null,
      invite: null,
    };

    if (!hasCompletedRelationship(session)) {
      return { status: 'relationship_missing', invite, session };
    }

    return {
      status: 'ready',
      invite,
      session,
      relationship_type: session.relationship_type,
      relationship_custom_label: session.relationship_custom_label ?? null,
    };
  }

  // No valid session in localStorage — fall through to real network validation
  const invite = await validateContributorInvite(inviteToken);

  if (invite.status !== 'valid') {
    return { status: invite.status, invite, session: null };
  }

  const freshSession = getStoredContributorSession(inviteToken);

  if (!hasValidContributorSession(freshSession, invite)) {
    return { status: 'missing', invite, session: null };
  }

  if (!hasCompletedRelationship(freshSession)) {
    return { status: 'relationship_missing', invite, session: freshSession };
  }

  return {
    status: 'ready',
    invite,
    session: freshSession,
    relationship_type: freshSession.relationship_type,
    relationship_custom_label: freshSession.relationship_custom_label ?? null,
  };
}

function getQuestionsForDraft(draft) {
  return getQuestionSetForContributorRelationship(
    draft?.relationship_type ?? draft?.session?.relationship_type,
    draft?.relationship_custom_label ??
      draft?.session?.relationship_custom_label ??
      draft?.session?.relationship_label,
  );
}

export async function getQuestionnaireResponses(inviteToken) {
  const draft = await getContributorQuestionnaireDraft(inviteToken);

  if (draft.status !== "ready") {
    throw new Error("Your contribution could not be found.");
  }

  const result = await getResponses(inviteToken, {
    contributor_id: draft.session.contributorId,
    contributor_token: draft.session.contributorToken,
  });
  const currentQuestions = getQuestionsForDraft(draft);
  const currentQuestionIds = new Set(currentQuestions.map((question) => question.id));

  return (result.responses ?? []).map((response) => {
    const questionIndex = Number.isFinite(Number(response.order_index))
      ? Number(response.order_index) - 1
      : Number(response.question_order) - 1;
    const question = currentQuestions[questionIndex];
    const questionId = response.question_id ?? question?.id ?? response.question_text;

    return {
      ...response,
      question_id: questionId,
      question_order: response.question_order ?? response.order_index,
      answer_text: response.answer_text ?? response.response_text ?? "",
      input_mode: response.input_mode === "speech" ? "speech" : "text",
      saved_at: response.saved_at ?? response.updated_at ?? response.created_at ?? null,
    };
  }).filter((response) => currentQuestionIds.has(response.question_id));
}
export async function getMemorialContributors(memorialId, token) {
  if (!memorialId) throw new Error("memorialId is required");

  const accessToken = token?.access_token || token || (await getAuthToken()) || "";
  if (!accessToken) return { contributors: [] };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(
      `${API_BASE_URL}/memorials/${encodeURIComponent(memorialId)}/contributors`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      },
    );

    if (!res.ok) throw new Error(`Failed to fetch contributors: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
  // DO NOT catch here — let manage/page.jsx loadContributors catch it
  // so contributorsError gets set and the user sees a real error
}

async function organizerContributorRequest(path, token, options = {}) {
  const accessToken = token?.access_token || token || (await getAuthToken()) || "";
  if (!accessToken) {
    throw new Error("You need to be signed in to manage contributors.");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Contributor request failed.");
  }

  return data;
}

export async function getMemorialContributorSubmission(memorialId, contributorId, token) {
  if (!memorialId) throw new Error("memorialId is required");
  if (!contributorId) throw new Error("contributorId is required");

  return organizerContributorRequest(
    `/memorials/${encodeURIComponent(memorialId)}/contributors/${encodeURIComponent(contributorId)}/submission`,
    token,
  );
}

export async function getMemorialApprovedArchive(memorialId, token) {
  if (!memorialId) throw new Error("memorialId is required");

  return organizerContributorRequest(
    `/memorials/${encodeURIComponent(memorialId)}/archive`,
    token,
  );
}

export async function updateMemorialContributorStatus(memorialId, contributorId, status, token) {
  if (!memorialId) throw new Error("memorialId is required");
  if (!contributorId) throw new Error("contributorId is required");
  if (!status) throw new Error("status is required");

  return organizerContributorRequest(
    `/memorials/${encodeURIComponent(memorialId)}/contributors/${encodeURIComponent(contributorId)}/status`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export async function deleteMemorialContributor(memorialId, contributorId, token) {
  if (!memorialId) throw new Error("memorialId is required");
  if (!contributorId) throw new Error("contributorId is required");

  return organizerContributorRequest(
    `/memorials/${encodeURIComponent(memorialId)}/contributors/${encodeURIComponent(contributorId)}`,
    token,
    { method: "DELETE" },
  );
}

export async function saveQuestionnaireResponse(inviteToken, response, options = {}) {
  const draft =
    options.draft ??
    (options.session
      ? { status: "ready", session: options.session }
      : await getContributorQuestionnaireDraft(inviteToken));

  if (draft.status !== "ready") {
    throw new Error("Your contribution could not be found.");
  }

  const inputMode =
    response.inputMode === "speech" || response.input_mode === "speech" ? "speech" : "text";
  const now = new Date().toISOString();
  const questionId = response.questionId ?? response.question_id;
  const questionOrder = response.questionOrder ?? response.question_order;
  const currentQuestions = getQuestionsForDraft(draft);
  const question =
    currentQuestions.find((item) => item.id === questionId) ??
    currentQuestions[Number(questionOrder) - 1];
  const responsePayload = {
    contributor_token: draft.session.contributorToken,
    contributor_id: draft.session.contributorId,
    memorial_id: draft.session.memorialId,
    invite_token: inviteToken,
    question_id: questionId,
    question_text: response.questionText ?? response.question_text ?? question?.prompt ?? questionId,
    question_order: questionOrder,
    order_index: questionOrder,
    answer_text: response.answerText ?? response.answer_text ?? "",
    response_text: response.answerText ?? response.answer_text ?? "",
    input_mode: inputMode,
    saved_at: now,
  };

  const result = await saveResponses(inviteToken, [responsePayload], {
    contributorToken: draft.session.contributorToken,
    signal: options.signal,
  });
  return result.responses?.[0] ?? responsePayload;
}

export async function getContributorReviewDraft(inviteToken) {
  const invite = await validateContributorInvite(inviteToken);

  if (invite.status !== "valid") {
    return {
      status: invite.status,
      invite,
      session: null,
      summary: null,
    };
  }

  const session = getStoredContributorSession(inviteToken);

  if (!hasValidContributorSession(session, invite)) {
    return {
      status: "missing",
      invite,
      session: null,
      summary: null,
    };
  }

  const summary = await getContributorSummary(inviteToken);

  return {
    status: "ready",
    invite,
    session,
    summary: {
      ...summary,
      contributor: {
        ...summary?.contributor,
        id: session.contributorId,
        name: session.contributorName,
        relationship_type: session.relationship_type ?? "",
        relationship_label: session.relationship_custom_label ?? null,
      },
    },
  };
}

export async function submitContributorDraft(inviteToken, readyDraft = null) {
  const draft = readyDraft?.status === "ready" ? readyDraft : await getContributorReviewDraft(inviteToken);

  if (draft.status !== "ready") {
    throw new Error("Your contribution could not be found. Please return to the invitation page.");
  }

  const result = await submitContribution(inviteToken, draft.session.contributorToken);
  const submittedContributor = result?.contributor;

  if (!submittedContributor?.status || !submittedContributor?.submitted_at) {
    console.error("Unexpected contributor submit response.", result);
    throw new Error("The Remember API did not confirm the contribution was submitted.");
  }

  const updatedSession = {
    ...draft.session,
    status: submittedContributor.status,
    submittedAt: submittedContributor.submitted_at,
    updatedAt: submittedContributor.submitted_at,
  };

  storeContributorSession(inviteToken, updatedSession);

  return {
    contributor: submittedContributor,
    session: updatedSession,
  };
}

export async function getContributorSubmittedDraft(inviteToken) {
  const invite = await validateContributorInvite(inviteToken);
  const session = getStoredContributorSession(inviteToken);

  if (invite.status !== "valid") {
    return {
      status: invite.status,
      invite,
      session: null,
    };
  }

  if (!hasValidContributorSession(session, invite)) {
    return {
      status: "missing",
      invite,
      session: null,
    };
  }

  return {
    status: "ready",
    invite,
    session,
  };
}

export async function deleteContributorPhoto(memorialId, contributorId, assetId, token) {
  return organizerContributorRequest(
    `/memorials/${encodeURIComponent(memorialId)}/contributors/${encodeURIComponent(contributorId)}/photos/${encodeURIComponent(assetId)}`,
    token,
    { method: 'DELETE' }
  )
}

export async function deleteContributorVoice(memorialId, contributorId, recordingId, token) {
  return organizerContributorRequest(
    `/memorials/${encodeURIComponent(memorialId)}/contributors/${encodeURIComponent(contributorId)}/voices/${encodeURIComponent(recordingId)}`,
    token,
    { method: 'DELETE' }
  )
}

export async function deleteContributorResponse(memorialId, contributorId, responseId, token) {
  return organizerContributorRequest(
    `/memorials/${encodeURIComponent(memorialId)}/contributors/${encodeURIComponent(contributorId)}/responses/${encodeURIComponent(responseId)}`,
    token,
    { method: 'DELETE' }
  )
}

export async function deleteContributorStory(memorialId, contributorId, storyId, token) {
  return organizerContributorRequest(
    `/memorials/${encodeURIComponent(memorialId)}/contributors/${encodeURIComponent(contributorId)}/stories/${encodeURIComponent(storyId)}`,
    token,
    { method: 'DELETE' }
  )
}

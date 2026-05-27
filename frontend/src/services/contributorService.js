import {
  ApiRequestError,
  getInviteToken,
  getResponses,
  saveRelationship,
  saveResponses,
  startContribution,
} from "@/lib/api.js";
import {
  CONTRIBUTOR_RELATIONSHIP_OPTIONS,
  CONTRIBUTOR_RELATIONSHIP_OTHER,
} from "@/lib/contribute/relationshipOptions.js";

const CONTRIBUTOR_SESSION_STORAGE_PREFIX = "remember_contributor_session";

function getSessionStorageKey(inviteToken) {
  return `${CONTRIBUTOR_SESSION_STORAGE_PREFIX}:${inviteToken}`;
}

function getStoredContributorSession(inviteToken) {
  if (typeof window === "undefined") {
    return null;
  }

  const storedSession = window.localStorage.getItem(getSessionStorageKey(inviteToken));

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession);
  } catch {
    window.localStorage.removeItem(getSessionStorageKey(inviteToken));
    return null;
  }
}

function storeContributorSession(inviteToken, session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getSessionStorageKey(inviteToken), JSON.stringify(session));
}

function isExpired(expiresAt) {
  return Boolean(expiresAt) && new Date(expiresAt).getTime() < Date.now();
}

function getInviteStatus(invite) {
  const inviteLink = invite?.invite ?? invite?.link;

  if (!inviteLink) {
    return "invalid";
  }

  if (!invite?.memorial) {
    return "missing_data";
  }

  if (isExpired(inviteLink.expires_at)) {
    return "expired";
  }

  if (inviteLink.is_active === false || invite.memorial.contributions_open === false) {
    return "closed";
  }

  if (inviteLink.max_uses && inviteLink.use_count >= inviteLink.max_uses) {
    return "closed";
  }

  return "valid";
}

function getDeceasedName(memorial) {
  return memorial.deceased_name || memorial.subject_name || memorial.name || "";
}

function getDeceasedPhotoUrl(memorial) {
  return memorial.profile_photo_url || memorial.cover_photo_url || memorial.photo_url || null;
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
  const inviteLink = invite?.invite ?? invite?.link ?? null;
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
      invite: inviteLink,
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
    invite: inviteLink,
  };
}

export async function validateContributorInvite(inviteToken) {
  try {
    const invite = await getInviteToken(inviteToken);
    const status = getInviteStatus(invite);

    return normalizeInvite(inviteToken, invite, status);
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

  if (storedSession?.contributorId && storedSession.memorialId === invite.memorialId) {
    const resumedSession = {
      ...storedSession,
      inviteToken,
      memorialId: invite.memorialId,
      contributorName: trimmedContributorName,
      updatedAt: now,
    };

    storeContributorSession(inviteToken, resumedSession);
    return resumedSession;
  }

  const contribution = await startContribution(inviteToken, trimmedContributorName);
  const session = {
    inviteToken,
    memorialId: invite.memorialId,
    contributorId: contribution.contributor.id,
    contributorToken: contribution.contributor_token,
    contributorName: trimmedContributorName,
    createdAt: contribution.contributor.created_at ?? now,
    updatedAt: contribution.contributor.updated_at ?? now,
  };

  storeContributorSession(inviteToken, session);
  return session;
}

function hasValidContributorSession(session, invite) {
  return Boolean(
    session?.contributorId &&
      session?.contributorToken &&
      session?.memorialId &&
      session.memorialId === invite.memorialId,
  );
}

function hasCompletedRelationship(session) {
  if (!session?.relationship_type) {
    return false;
  }

  if (session.relationship_type === CONTRIBUTOR_RELATIONSHIP_OTHER) {
    return Boolean(session.relationship_custom_label);
  }

  return true;
}

export async function getContributorRelationshipDraft(inviteToken) {
  const invite = await validateContributorInvite(inviteToken);

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

export async function saveContributorRelationship(
  inviteToken,
  { relationshipType, relationshipCustomLabel = "" },
) {
  const trimmedRelationshipType = relationshipType.trim();
  const trimmedCustomLabel = relationshipCustomLabel.trim();

  if (!CONTRIBUTOR_RELATIONSHIP_OPTIONS.includes(trimmedRelationshipType)) {
    throw new Error("Please choose a relationship.");
  }

  if (trimmedRelationshipType === CONTRIBUTOR_RELATIONSHIP_OTHER && !trimmedCustomLabel) {
    throw new Error("Please describe your relationship.");
  }

  const draft = await getContributorRelationshipDraft(inviteToken);

  if (draft.status !== "ready") {
    throw new Error("Your contribution could not be found.");
  }

  const relationship_custom_label =
    trimmedRelationshipType === CONTRIBUTOR_RELATIONSHIP_OTHER ? trimmedCustomLabel : null;

  const savedRelationship = await saveRelationship(inviteToken, {
    contributor_id: draft.session.contributorId,
    contributor_token: draft.session.contributorToken,
    relationship_type: trimmedRelationshipType,
    relationship_custom_label,
  });

  const updatedSession = {
    ...draft.session,
    relationship_type: savedRelationship.contributor?.relationship_type ?? trimmedRelationshipType,
    relationship_custom_label:
      savedRelationship.contributor?.relationship_custom_label ?? relationship_custom_label,
    updatedAt: savedRelationship.contributor?.updated_at ?? new Date().toISOString(),
  };

  storeContributorSession(inviteToken, updatedSession);
  return updatedSession;
}

export async function getContributorQuestionnaireDraft(inviteToken) {
  const invite = await validateContributorInvite(inviteToken);

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

  if (!hasCompletedRelationship(session)) {
    return {
      status: "relationship_missing",
      invite,
      session,
    };
  }

  return {
    status: "ready",
    invite,
    session,
    relationship_type: session.relationship_type,
    relationship_custom_label: session.relationship_custom_label ?? null,
  };
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

  return result.responses ?? [];
}

export async function saveQuestionnaireResponse(inviteToken, response) {
  const draft = await getContributorQuestionnaireDraft(inviteToken);

  if (draft.status !== "ready") {
    throw new Error("Your contribution could not be found.");
  }

  const inputMode =
    response.inputMode === "speech" || response.input_mode === "speech" ? "speech" : "text";
  const now = new Date().toISOString();
  const responsePayload = {
    contributor_id: draft.session.contributorId,
    memorial_id: draft.session.memorialId,
    invite_token: inviteToken,
    question_id: response.questionId ?? response.question_id,
    question_order: response.questionOrder ?? response.question_order,
    answer_text: response.answerText ?? response.answer_text ?? "",
    input_mode: inputMode,
    saved_at: now,
  };

  const result = await saveResponses(inviteToken, [responsePayload]);
  return result.responses?.[0] ?? responsePayload;
}

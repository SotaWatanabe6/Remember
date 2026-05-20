import { getInviteToken, saveRelationship, startContribution } from "@/lib/api.js";
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
  if (!invite?.link || !invite?.memorial) {
    return "invalid";
  }

  if (isExpired(invite.link.expires_at)) {
    return "expired";
  }

  if (invite.link.is_active === false || invite.memorial.contributions_open === false) {
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

export async function validateContributorInvite(inviteToken) {
  try {
    const invite = await getInviteToken(inviteToken);
    const status = getInviteStatus(invite);
    const memorialId = invite?.memorial?.id ?? "";
    const deceasedName = getDeceasedName(invite?.memorial);

    if (status === "valid" && (!memorialId || !deceasedName)) {
      return {
        inviteToken,
        memorialId,
        status: "invalid",
        deceased: {
          name: "",
          photoUrl: null,
        },
      };
    }

    return {
      inviteToken,
      memorialId,
      status,
      deceased: {
        name: deceasedName,
        photoUrl: getDeceasedPhotoUrl(invite?.memorial),
      },
    };
  } catch {
    return {
      inviteToken,
      memorialId: "",
      status: "invalid",
      deceased: {
        name: "",
        photoUrl: null,
      },
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

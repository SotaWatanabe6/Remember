// frontend/src/lib/api.js
// ─────────────────────────────────────────────────────────────────────────────
// MOCK API LAYER
// Every API call in the app goes through this file.
// On Day 9, swap mock return values for real fetch() calls — nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

import { mockMemorials } from "@/data/mockMemorials.js";
import { getStore, clearStore } from "@/lib/contributionStore";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const MOCK_DELAY = 500;

// ─── Questionnaire responses localStorage ───────────

const MOCK_RESPONSES_STORAGE_PREFIX = "remember_mock_questionnaire_responses";

function getResponsesStorageKey(token) {
  return `${MOCK_RESPONSES_STORAGE_PREFIX}:${token}`;
}

function readStoredResponses(token) {
  if (typeof window === "undefined") return {};
  const storedResponses = window.localStorage.getItem(
    getResponsesStorageKey(token),
  );
  if (!storedResponses) return {};
  try {
    return JSON.parse(storedResponses);
  } catch {
    window.localStorage.removeItem(getResponsesStorageKey(token));
    return {};
  }
}

function writeStoredResponses(token, responsesByContributor) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getResponsesStorageKey(token),
    JSON.stringify(responsesByContributor),
  );
}

// ─── Session localStorage (read-only — Sungjun writes this) ───────────

function getSessionStorageKey(token) {
  return `remember_contributor_session:${token}`;
}

function readContributorSession(token) {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(
      window.localStorage.getItem(getSessionStorageKey(token)) || "null",
    );
  } catch {
    return null;
  }
}

// ─── CONTRIBUTE FLOW ───────────

/**
 * GET /contribute/:token
 * Validates invite token, returns memorial details for landing page.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getInviteToken(token) {
  await delay(MOCK_DELAY);

  if (token === "invalid") {
    throw new Error("Invalid invite link");
  }

  const memorial = mockMemorials[0];
  const now = new Date();
  const expiredAt = new Date(now);
  expiredAt.setDate(expiredAt.getDate() - 1);

  return {
    memorial: {
      id: memorial.id,
      deceased_name: memorial.deceased_name,
      profile_photo_url: memorial.profile_photo_url,
      date_of_birth: memorial.birth_date,
      date_of_passing: memorial.death_date,
      status: token === "closed" ? "closed" : "active",
      contributions_open: token !== "closed",
    },
    link: {
      id: "a1b2c3d4-0000-0000-0000-000000000002",
      is_active: token !== "closed",
      use_count: 3,
      max_uses: null,
      expires_at: token === "expired" ? expiredAt.toISOString() : null,
    },
  };
}

/**
 * POST /contribute/:token/start
 * Creates contributor row, returns contributor session token.
 * Body: { name: string }
 * TODO: Replace with real fetch() on Day 9.
 */
export async function startContribution(token, name) {
  await delay(MOCK_DELAY);
  const now = new Date().toISOString();

  return {
    contributor: {
      id: "c1b2c3d4-0000-0000-0000-000000000001",
      name,
      status: "in_progress",
      created_at: now,
      updated_at: now,
    },
    contributor_token: "mock-contributor-session-token",
  };
}

/**
 * POST /contribute/:token/relationship
 * Saves relationship type to contributors table.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function saveRelationship(token, relationshipInput) {
  await delay(MOCK_DELAY);

  return {
    success: true,
    contributor: {
      id: relationshipInput.contributor_id,
      relationship_type: relationshipInput.relationship_type,
      relationship_custom_label:
        relationshipInput.relationship_custom_label ?? null,
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * POST /contribute/:token/responses
 * Saves questionnaire Q&A. Supports partial saves (autosave).
 * TODO: Replace with real fetch() on Day 9.
 */
export async function saveResponses(token, responses) {
  await delay(MOCK_DELAY);
  const now = new Date().toISOString();
  const responsesByContributor = readStoredResponses(token);
  const savedResponses = [];

  responses.forEach((response) => {
    if (!response?.contributor_id || !response?.question_id) return;

    const contributorResponses =
      responsesByContributor[response.contributor_id] ?? {};
    const savedResponse = {
      ...response,
      invite_token: token,
      saved_at: response.saved_at ?? now,
    };

    contributorResponses[response.question_id] = savedResponse;
    responsesByContributor[response.contributor_id] = contributorResponses;
    savedResponses.push(savedResponse);
  });

  writeStoredResponses(token, responsesByContributor);

  return {
    success: true,
    saved: savedResponses.length,
    responses: savedResponses,
  };
}

/**
 * GET /contribute/:token/responses
 * Returns saved questionnaire responses for one contributor session.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getResponses(token, contributorInput) {
  await delay(MOCK_DELAY);
  const responsesByContributor = readStoredResponses(token);
  const contributorResponses =
    responsesByContributor[contributorInput.contributor_id] ?? {};

  return {
    responses: Object.values(contributorResponses).sort(
      (a, b) => (a.question_order ?? 0) - (b.question_order ?? 0),
    ),
  };
}

/**
 * GET /contribute/:token/summary
 * Returns everything the contributor has so far — used on review screen.
 * Reads photos + voice from contributionStore (in-memory).
 * Reads questionnaire responses from localStorage.
 */
export async function getContributorSummary(token) {
  await delay(MOCK_DELAY);

  const session = readContributorSession(token);
  const store = getStore();

  // Photos from in-memory store
  const photos = store.photos.map((p) => ({
    id: p.id,
    file_name: p.file.name,
    previewUrl: p.previewUrl,
    caption: p.caption,
  }));

  // Voice from in-memory store
  const voice = store.voice.map((r) => ({
    id: r.id,
    contributor_title: r.title,
    file_name: r.file.name,
    previewUrl: r.previewUrl,
    duration_seconds: 0,
  }));

  // Questionnaire responses from localStorage
  const contributorId =
    session?.contributorId || "c1b2c3d4-0000-0000-0000-000000000001";
  const responsesByContributor = readStoredResponses(token);
  const contributorResponses = responsesByContributor[contributorId] ?? {};
  const responses = Object.values(contributorResponses)
    .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
    .map((r) => ({
      question_text: r.question_id || r.question_text || "Question",
      response_text: r.answer_text || r.response_text || "",
    }));

  return {
    contributor: {
      id: contributorId,
      name: session?.contributorName || "Contributor",
      relationship_type: session?.relationship_type || "",
      relationship_label: session?.relationship_custom_label || null,
    },
    responses,
    photos,
    voice,
  };
}

/**
 * DELETE a photo from the in-memory store (review page delete).
 */
export async function deletePhoto(token, assetId) {
  const { removePhoto } = await import("@/lib/contributionStore");
  removePhoto(assetId);
  return { success: true };
}

/**
 * DELETE a voice recording from the in-memory store (review page delete).
 */
export async function deleteVoice(token, recordingId) {
  const { removeVoice } = await import("@/lib/contributionStore");
  removeVoice(recordingId);
  return { success: true };
}

/**
 * POST /contribute/:token/submit
 * Sends all photos, voice, and responses to the backend in one request.
 * TODO: Replace MOCK_DELAY simulation with real fetch() on Day 9.
 */
export async function submitContribution(token) {
  const store = getStore();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // ─── PLACEHOLDERS — replace with real session values from Sungjun ───
  const contributor_token = "00000000-0000-0000-0000-000000000002";
  // ────────────────────────────────────────────────────────────────────

  // 1. Upload photos
  if (store.photos.length > 0) {
    const photoForm = new FormData();
    photoForm.append('contributor_token', contributor_token);
    store.photos.forEach((photo) => {
      photoForm.append('files[]', photo.file, photo.file.name);
    });
    if (store.photos[0]?.caption) {
      photoForm.append('caption', store.photos[0].caption);
    }

    const photoRes = await fetch(`${BACKEND_URL}/contribute/${token}/photos`, {
      method: 'POST',
      body: photoForm,
    });
    if (!photoRes.ok) throw new Error('Photo upload failed');
  }

  // 2. Upload voice
  for (const rec of store.voice) {
    const voiceForm = new FormData();
    voiceForm.append('contributor_token', contributor_token);
    voiceForm.append('file', rec.file, rec.file.name);
    voiceForm.append('contributor_title', rec.title);

    const voiceRes = await fetch(`${BACKEND_URL}/contribute/${token}/voice`, {
      method: 'POST',
      body: voiceForm,
    });
    if (!voiceRes.ok) throw new Error('Voice upload failed');
  }

  // 3. Mark as submitted
  const submitRes = await fetch(`${BACKEND_URL}/contribute/${token}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contributor_token }),
  });
  if (!submitRes.ok) throw new Error('Submission failed');

  clearStore();
  return submitRes.json();
}

// ─── OUTPUT TABS (viewer experience) ─────────────────────────────────────────

/**
 * GET /memorials/:id/output
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getMemorialOutput(memorialId) {
  await delay(MOCK_DELAY);
  return {
    story: [
      {
        order_index: 1,
        photo_url: null,
        matched_quote:
          "He always made everyone feel like the most important person in the room.",
        contributor_name: "Sarah",
        relationship_type: "friend",
        theme_label: "Warmth",
      },
      {
        order_index: 2,
        photo_url: null,
        matched_quote:
          "Dad would wake up at 5am just to make sure everyone had a packed lunch.",
        contributor_name: "Michael",
        relationship_type: "family",
        theme_label: "Quiet Devotion",
      },
      {
        order_index: 3,
        photo_url: null,
        matched_quote:
          "The way he laughed — you could hear it from three rooms away.",
        contributor_name: "Tom",
        relationship_type: "friend",
        theme_label: "Joy",
      },
    ],
    constellation: {
      nodes: [
        {
          id: "theme-uuid-1",
          label: "The Morning Routines",
          category: "daily_life",
          summary:
            "Three contributors independently described rituals around morning — coffee, early rising, and quiet acts of care before the household woke up.",
          prominence_score: 0.85,
          quotes: [
            {
              text: "He made coffee for everyone before they even woke up.",
              contributor_name: "Sarah",
              relationship_type: "friend",
            },
            {
              text: "Dad was always first up. Always.",
              contributor_name: "Michael",
              relationship_type: "family",
            },
          ],
          photo_ids: ["photo-uuid-1"],
        },
        {
          id: "theme-uuid-2",
          label: "Warmth at the Table",
          category: "relationships",
          summary:
            "Multiple contributors recalled the feeling of being welcomed — meals that stretched for hours, no one ever turned away.",
          prominence_score: 0.72,
          quotes: [
            {
              text: "His table always had room for one more.",
              contributor_name: "Tom",
              relationship_type: "friend",
            },
          ],
          photo_ids: ["photo-uuid-2", "photo-uuid-3"],
        },
        {
          id: "theme-uuid-3",
          label: "Quiet Devotion",
          category: "character",
          summary:
            "The things he did without being asked — packed lunches, fixed fences, showed up early. Never announced, just done.",
          prominence_score: 0.61,
          quotes: [
            {
              text: "He never asked for thanks. He just did it.",
              contributor_name: "Michael",
              relationship_type: "family",
            },
          ],
          photo_ids: [],
        },
      ],
      edges: [
        {
          source: "theme-uuid-1",
          target: "theme-uuid-2",
          relationship_type: "family",
          weight: 2,
        },
        {
          source: "theme-uuid-2",
          target: "theme-uuid-3",
          relationship_type: "friend",
          weight: 1,
        },
      ],
    },
    voices: [
      {
        id: "voice-uuid-1",
        contributor_title: "Voicemail from Christmas 2019",
        key_quote: "I just called to say I love you all. Merry Christmas.",
        ai_category: "Everyday Love",
        ai_tags: ["holiday", "love", "family"],
        transcript_text:
          "Hey it's dad, just calling to say Merry Christmas. Hope you're all having a good one. I just called to say I love you all. Merry Christmas. See you for dinner.",
        audio_url: null,
        duration_seconds: 47.3,
      },
      {
        id: "voice-uuid-2",
        contributor_title: "Voice note about the garden — June 2022",
        key_quote:
          "The tomatoes are finally coming in. I've been waiting all summer for these.",
        ai_category: "Everyday Joy",
        ai_tags: ["garden", "summer", "patience"],
        transcript_text:
          "Just wanted to record this. The tomatoes are finally coming in. I've been waiting all summer for these. Beautiful. Your grandmother would have loved them.",
        audio_url: null,
        duration_seconds: 28.1,
      },
    ],
    photos: [
      {
        album_name: "The Kitchen Table Years",
        cover_photo_url: null,
        photos: [
          {
            id: "photo-uuid-1",
            url: null,
            caption: null,
            taken_at: "2019-12-25",
            contributor_name: "Sarah",
          },
          {
            id: "photo-uuid-2",
            url: null,
            caption: "Summer BBQ",
            taken_at: "2018-07-04",
            contributor_name: "Michael",
          },
        ],
      },
      {
        album_name: "The Garden in Every Season",
        cover_photo_url: null,
        photos: [
          {
            id: "photo-uuid-3",
            url: null,
            caption: null,
            taken_at: "2022-06-15",
            contributor_name: "Tom",
          },
          {
            id: "photo-uuid-4",
            url: null,
            caption: null,
            taken_at: "2021-09-03",
            contributor_name: "Sarah",
          },
        ],
      },
      {
        album_name: "Faces at the Door",
        cover_photo_url: null,
        photos: [
          {
            id: "photo-uuid-5",
            url: null,
            caption: null,
            taken_at: null,
            contributor_name: "Michael",
          },
        ],
      },
    ],
  };
}

/**
 * GET /share/:shareToken
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getShareToken(shareToken) {
  await delay(MOCK_DELAY);
  if (shareToken === "invalid")
    throw new Error("This share link is invalid or has expired");
  return getMemorialOutput("mock-memorial-id");
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZER FLOW
// ─────────────────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();
const fakeToken = () => "mock_jwt_" + Math.random().toString(36).slice(2);
const makeId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2)}`;
const isBrowser = () => typeof window !== "undefined";

const AUTH_STORAGE_KEY = "remember.mock.auth";
const MEMORIALS_STORAGE_KEY = "remember.mock.memorials";
const USERS_STORAGE_KEY = "remember.mock.users";

const MOCK_USER = {
  id: "user-uuid-0000-0000-000000000001",
  email: "organizer@example.com",
};

const MOCK_USERS = [
  {
    ...MOCK_USER,
    full_name: "Maya Hart",
    password: null,
  },
];

const MOCK_MEMORIALS = mockMemorials.map((m) => ({
  id: m.id,
  user_id: MOCK_USER.id,
  subject_name: m.deceased_name,
  date_of_birth: m.birth_date ?? null,
  date_of_passing: m.death_date ?? null,
  cover_photo_url: m.profile_photo_url ?? null,
  status: m.status ?? "collecting",
  created_at: m.created_at,
  updated_at: m.updated_at,
}));

const MOCK_CONTRIBUTORS = [
  {
    id: "contributor-uuid-000000000001",
    name: "Sarah",
    relationship_type: "friend",
    status: "submitted",
    submitted_at: now(),
  },
  {
    id: "contributor-uuid-000000000002",
    name: "Michael",
    relationship_type: "family",
    status: "submitted",
    submitted_at: now(),
  },
  {
    id: "contributor-uuid-000000000003",
    name: "Tom Harris",
    relationship_type: "colleague",
    status: "in_progress",
    submitted_at: null,
  },
];

const MOCK_INVITE_LINK = {
  id: "invite-uuid-00-0000-000000000001",
  token: "mock_invite_abc123",
  url: "http://localhost:3000/contribute/mock_invite_abc123",
  is_active: true,
  expires_at: "2026-06-01",
  max_uses: 50,
  use_count: 3,
  created_at: now(),
};

const readStoredValue = (key, fallbackValue) => {
  if (!isBrowser()) return fallbackValue;
  const storedValue = window.localStorage.getItem(key);
  if (!storedValue) return fallbackValue;
  try {
    return JSON.parse(storedValue);
  } catch {
    window.localStorage.removeItem(key);
    return fallbackValue;
  }
};

const writeStoredValue = (key, value) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const clearStoredValue = (key) => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
};

const ensureMockState = () => {
  if (!isBrowser()) return;
  if (!readStoredValue(USERS_STORAGE_KEY, null)) {
    writeStoredValue(USERS_STORAGE_KEY, MOCK_USERS);
  }
  if (!readStoredValue(MEMORIALS_STORAGE_KEY, null)) {
    writeStoredValue(MEMORIALS_STORAGE_KEY, MOCK_MEMORIALS);
  }
};

const getStoredUsers = () => {
  ensureMockState();
  return readStoredValue(USERS_STORAGE_KEY, MOCK_USERS);
};

const getStoredMemorials = () => {
  ensureMockState();
  return readStoredValue(MEMORIALS_STORAGE_KEY, MOCK_MEMORIALS);
};

const getStoredSession = () => readStoredValue(AUTH_STORAGE_KEY, null);
const setStoredSession = ({ user, token }) => {
  writeStoredValue(AUTH_STORAGE_KEY, { user, token });
};
const getActiveUser = () => getStoredSession()?.user ?? MOCK_USER;

export async function register({ email, password, full_name }) {
  await delay(MOCK_DELAY);
  const trimmedEmail = email.trim();
  const users = getStoredUsers();
  const emailAlreadyExists = users.some(
    (user) => user.email.toLowerCase() === trimmedEmail.toLowerCase(),
  );

  if (emailAlreadyExists) {
    throw new Error("An account with this email already exists.");
  }

  const user = {
    id: makeId("user-uuid"),
    email: trimmedEmail,
    full_name: full_name ?? "",
  };
  const token = fakeToken();

  writeStoredValue(USERS_STORAGE_KEY, [...users, { ...user, password }]);
  setStoredSession({ user, token });

  return { user, token };
}

export async function login({ email, password }) {
  await delay(MOCK_DELAY);
  const trimmedEmail = email.trim();
  const users = getStoredUsers();
  const matchingUser = users.find(
    (user) => user.email.toLowerCase() === trimmedEmail.toLowerCase(),
  );

  if (matchingUser?.password && matchingUser.password !== password) {
    throw new Error("Invalid email or password.");
  }

  const user = matchingUser
    ? {
        id: matchingUser.id,
        email: matchingUser.email,
        full_name: matchingUser.full_name ?? "",
      }
    : { ...MOCK_USER, email: trimmedEmail || MOCK_USER.email };
  const token = fakeToken();

  setStoredSession({ user, token });
  return { user, token };
}

export async function logout() {
  await delay(MOCK_DELAY / 2);
  clearStoredValue(AUTH_STORAGE_KEY);
  return { success: true };
}

export async function getCurrentUser() {
  await delay(MOCK_DELAY / 2);
  return getActiveUser();
}

export async function createMemorial({
  subject_name,
  date_of_birth,
  date_of_passing,
  cover_photo_url,
}) {
  await delay(MOCK_DELAY);
  const currentUser = getActiveUser();
  const createdAt = now();
  const memorial = {
    id: makeId("memorial"),
    user_id: currentUser.id,
    subject_name: subject_name.trim(),
    date_of_birth: date_of_birth ?? null,
    date_of_passing: date_of_passing ?? null,
    cover_photo_url: cover_photo_url ?? null,
    status: "collecting",
    created_at: createdAt,
    updated_at: createdAt,
  };

  writeStoredValue(MEMORIALS_STORAGE_KEY, [memorial, ...getStoredMemorials()]);
  return { memorial };
}

export async function getMemorials() {
  await delay(MOCK_DELAY);
  const currentUser = getActiveUser();
  return {
    memorials: getStoredMemorials()
      .filter((memorial) => memorial.user_id === currentUser.id)
      .sort(
        (left, right) =>
          new Date(right.updated_at ?? right.created_at).getTime() -
          new Date(left.updated_at ?? left.created_at).getTime(),
      ),
  };
}

export async function getMemorial(id) {
  await delay(MOCK_DELAY);
  const memorial = getStoredMemorials().find((m) => m.id === id) ?? null;
  return { memorial };
}

export async function createInviteLink(memorialId, { expires_at, max_uses }) {
  await delay(MOCK_DELAY);
  return {
    invite_link: {
      ...MOCK_INVITE_LINK,
      id: "invite-uuid-" + Math.random().toString(36).slice(2),
      expires_at,
      max_uses,
      created_at: now(),
    },
  };
}

export async function updateInviteLink(memorialId, { is_active }) {
  await delay(MOCK_DELAY);
  return {
    invite_link: {
      id: MOCK_INVITE_LINK.id,
      is_active,
    },
  };
}

export async function getContributors(memorialId) {
  await delay(MOCK_DELAY);
  return { contributors: MOCK_CONTRIBUTORS };
}

export async function createShareLink(memorialId) {
  await delay(MOCK_DELAY);
  const token = "mock_share_" + Math.random().toString(36).slice(2);
  return {
    share_link: {
      token,
      url: `http://localhost:3000/share/${token}`,
    },
  };
}

export async function triggerGeneration(memorialId) {
  await delay(MOCK_DELAY);
  return {
    job: {
      id: "job-uuid-" + Math.random().toString(36).slice(2),
      status: "queued",
      progress: 0,
      current_step: "Starting...",
      error_message: null,
    },
  };
}

let _mockProgress = 0;
export async function getJobStatus(jobId) {
  await delay(MOCK_DELAY);
  _mockProgress = Math.min(_mockProgress + 20, 100);
  const steps = [
    "Starting...",
    "Reading contributor responses...",
    "Finding recurring themes...",
    "Matching photos to themes...",
    "Building the story arc...",
  ];
  const stepIndex = Math.floor((_mockProgress / 100) * steps.length);
  return {
    job: {
      id: jobId,
      status: _mockProgress < 100 ? "processing" : "complete",
      progress: _mockProgress,
      current_step: steps[Math.min(stepIndex, steps.length - 1)],
      error_message: null,
    },
  };
}
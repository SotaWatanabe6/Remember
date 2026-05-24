// frontend/src/lib/api.js
// ─────────────────────────────────────────────────────────────────────────────
// MOCK API LAYER
// Every API call in the app goes through this file.
// On Day 9, swap mock return values for real fetch() calls — nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

import { mockMemorials } from "@/data/mockMemorials.js";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const MOCK_DELAY = 500;

// ─── Questionnaire responses localStorage ───────────

const MOCK_RESPONSES_STORAGE_PREFIX = 'remember_mock_questionnaire_responses';

function getResponsesStorageKey(token) {
  return `${MOCK_RESPONSES_STORAGE_PREFIX}:${token}`;
}

function readStoredResponses(token) {
  if (typeof window === 'undefined') return {};
  const storedResponses = window.localStorage.getItem(getResponsesStorageKey(token));
  if (!storedResponses) return {};
  try {
    return JSON.parse(storedResponses);
  } catch {
    window.localStorage.removeItem(getResponsesStorageKey(token));
    return {};
  }
}

function writeStoredResponses(token, responsesByContributor) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getResponsesStorageKey(token), JSON.stringify(responsesByContributor));
}

// ─── Photos localStorage ───────────

// NEW: localStorage helpers for photos
function getPhotosStorageKey(token) {
  return `remember_photos:${token}`;
}

function readStoredPhotos(token) {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(getPhotosStorageKey(token)) || '[]');
  } catch {
    return [];
  }
}

function writeStoredPhotos(token, photos) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getPhotosStorageKey(token), JSON.stringify(photos));
}

// ─── Voice localStorage ───────────

// NEW: localStorage helpers for voice recordings
function getVoiceStorageKey(token) {
  return `remember_voice:${token}`;
}

function readStoredVoice(token) {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(getVoiceStorageKey(token)) || '[]');
  } catch {
    return [];
  }
}

function writeStoredVoice(token, recordings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getVoiceStorageKey(token), JSON.stringify(recordings));
}

// ─── Session localStorage (read-only — Sungjun writes this) ───────────

function getSessionStorageKey(token) {
  return `remember_contributor_session:${token}`;
}

function readContributorSession(token) {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(getSessionStorageKey(token)) || 'null');
  } catch {
    return null;
  }
}

function writeContributorSession(token, session) {
  if (typeof window === 'undefined' || !session) return;
  window.localStorage.setItem(getSessionStorageKey(token), JSON.stringify(session));
}

// ─── CONTRIBUTE FLOW ───────────

/**
 * GET /contribute/:token
 * Validates invite token, returns memorial details for landing page.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getInviteToken(token) {
  await delay(MOCK_DELAY);

  if (token === 'invalid') {
    throw new Error('Invalid invite link');
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
      status: token === 'closed' ? 'closed' : 'active',
      contributions_open: token !== 'closed',
    },
    link: {
      id: 'a1b2c3d4-0000-0000-0000-000000000002',
      is_active: token !== 'closed',
      use_count: 3,
      max_uses: null,
      expires_at: token === 'expired' ? expiredAt.toISOString() : null,
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
      status: 'in_progress',
      created_at: now,
      updated_at: now,
    },
    contributor_token: "mock-contributor-session-token",
  };
}

/**
 * POST /contribute/:token/relationship
 * Saves relationship type to contributors table.
 * Body: { contributor_id, contributor_token, relationship_type, relationship_custom_label? }
 * TODO: Replace with real fetch() on Day 9.
 */
export async function saveRelationship(token, relationshipInput) {
  await delay(MOCK_DELAY);

  return {
    success: true,
    contributor: {
      id: relationshipInput.contributor_id,
      relationship_type: relationshipInput.relationship_type,
      relationship_custom_label: relationshipInput.relationship_custom_label ?? null,
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * POST /contribute/:token/responses
 * Saves questionnaire Q&A. Supports partial saves (autosave).
 * Saves to localStorage so review page can read real answers.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function saveResponses(token, responses) {
  await delay(MOCK_DELAY);
  const now = new Date().toISOString();
  const responsesByContributor = readStoredResponses(token);
  const savedResponses = [];

  responses.forEach((response) => {
    if (!response?.contributor_id || !response?.question_id) return;

    const contributorResponses = responsesByContributor[response.contributor_id] ?? {};
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
 * Reads from localStorage — matches what saveResponses() wrote.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getResponses(token, contributorInput) {
  await delay(MOCK_DELAY);
  const responsesByContributor = readStoredResponses(token);
  const contributorResponses = responsesByContributor[contributorInput.contributor_id] ?? {};

  return {
    responses: Object.values(contributorResponses).sort(
      (a, b) => (a.question_order ?? 0) - (b.question_order ?? 0),
    ),
  };
}

/**
 * POST /contribute/:token/photos
 * Uploads photos. Saves to localStorage so review page can read real uploads.
 * CHANGED: now persists to localStorage instead of returning one-off fake data.
 * TODO: Replace with real fetch() + FormData on Day 9.
 */
export async function uploadPhotos(token, files) {
  await delay(MOCK_DELAY * 2);

  const newAssets = files.map((file, i) => ({
    id: `photo-${Date.now()}-${i}`,
    file_name: file.name,
    file_type: file.type,
    file_size_bytes: file.size,
    storage_path: `memorials/mock/contributions/mock/photos/${file.name}`,
    storage_bucket: 'memorial-assets',
    taken_at: null,
    caption: null,
    // Store preview URL so review screen can show thumbnails
    previewUrl: typeof URL !== 'undefined' ? URL.createObjectURL(file) : null,
  }));

  // Append to any existing photos in localStorage
  const existing = readStoredPhotos(token);
  writeStoredPhotos(token, [...existing, ...newAssets]);

  return {
    success: true,
    uploaded: files.length,
    assets: newAssets,
  };
}

/**
 * POST /contribute/:token/voice
 * Uploads voice recording. Saves to localStorage so review page can read real uploads.
 * CHANGED: now persists to localStorage instead of returning one-off fake data.
 * contributor_title is required — throws if missing.
 * TODO: Replace with real fetch() + FormData on Day 9.
 */
export async function uploadVoice(token, file, contributorTitle) {
  await delay(MOCK_DELAY * 2);

  if (!contributorTitle || contributorTitle.trim() === '') {
    throw new Error('A title is required for each voice recording');
  }

  const recording = {
    id: `voice-${Date.now()}`,
    contributor_title: contributorTitle,
    file_name: file.name,
    file_type: file.type,
    file_size_bytes: file.size,
    storage_path: `memorials/mock/contributions/mock/voice/${file.name}`,
    storage_bucket: 'memorial-assets',
    duration_seconds: 0, // populated by backend after real upload
  };

  // Append to any existing recordings in localStorage
  const existing = readStoredVoice(token);
  writeStoredVoice(token, [...existing, recording]);

  return { success: true, recording };
}

/**
 * DELETE /contribute/:token/photos/:assetId
 * Removes a photo before submission.
 * CHANGED: now also removes from localStorage.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function deletePhoto(token, assetId) {
  await delay(MOCK_DELAY);

  const existing = readStoredPhotos(token);
  writeStoredPhotos(token, existing.filter((p) => p.id !== assetId));

  return { success: true };
}

/**
 * DELETE /contribute/:token/voice/:recordingId
 * Removes a voice recording before submission.
 * CHANGED: now also removes from localStorage.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function deleteVoice(token, recordingId) {
  await delay(MOCK_DELAY);

  const existing = readStoredVoice(token);
  writeStoredVoice(token, existing.filter((r) => r.id !== recordingId));

  return { success: true };
}

/**
 * GET /contribute/:token/summary
 * Returns everything the contributor submitted — used on review screen.
 * CHANGED: now reads from localStorage instead of returning hardcoded data.
 * Reads session (name + relationship) from Sungjun's key.
 * Reads photos and voice from keys written by uploadPhotos/uploadVoice.
 * Reads questionnaire responses from keys written by saveResponses.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getContributorSummary(token) {
  await delay(MOCK_DELAY);

  // Read contributor session — written by Sungjun's contributorService.js
  const session = readContributorSession(token);

  // Read photos uploaded in step 4
  const photos = readStoredPhotos(token);

  // Read voice recordings uploaded in step 5
  const voice = readStoredVoice(token);

  // Read questionnaire responses saved in step 3
  const contributorId = session?.contributorId || 'c1b2c3d4-0000-0000-0000-000000000001';
  const responsesByContributor = readStoredResponses(token);
  const contributorResponses = responsesByContributor[contributorId] ?? {};
  const responses = Object.values(contributorResponses)
    .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
    .map((r) => ({
      question_text: r.question_id || r.question_text || 'Question',
      response_text: r.answer_text || r.response_text || '',
    }));

  return {
    contributor: {
      id: contributorId,
      name: session?.contributorName || 'Contributor',
      relationship_type: session?.relationship_type || '',
      relationship_label: session?.relationship_custom_label || null,
    },
    responses,
    photos,
    voice,
  };
}

/**
 * POST /contribute/:token/submit
 * Finalises the contribution — sets contributor status = submitted.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function submitContribution(token) {
  await delay(MOCK_DELAY);
  const now = new Date().toISOString();
  const session = readContributorSession(token);

  if (session) {
    writeContributorSession(token, {
      ...session,
      status: 'submitted',
      submittedAt: now,
      updatedAt: now,
    });
  }

  return {
    success: true,
    submitted_at: now,
  };
}

// ─── OUTPUT TABS (viewer experience) ─────────────────────────────────────────

/**
 * GET /memorials/:id/output
 * Returns complete four-tab JSON for the memorial output page.
 * Rebecca owns: All Photos tab + output page shell.
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
 * Viewer-only access — same four-tab output, no organizer controls.
 * Returns identical shape to getMemorialOutput().
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
// Added from Phase 1 organizer api.js.
// ─────────────────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();
const fakeToken = () => "mock_jwt_" + Math.random().toString(36).slice(2);
const makeId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2)}`;
const isBrowser = () => typeof window !== "undefined";

const AUTH_STORAGE_KEY = "remember.mock.auth";
const MEMORIALS_STORAGE_KEY = "remember.mock.memorials";
const USERS_STORAGE_KEY = "remember.mock.users";

// ─── SEED DATA ────────────────────────────────────────────────────────────────

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

// Derived from the single source of truth in mockMemorials.js
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

const MOCK_MEMORIAL_ID = MOCK_MEMORIALS[0].id;

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

// ─── SHARED localStorage HELPERS ─────────────────────────────────────────────

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

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Creates a new organizer account.
 * Body: { email: string, password: string, full_name?: string }
 */
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

/**
 * POST /auth/login
 * Logs in to an existing organizer account.
 * Body: { email: string, password: string }
 */
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

// ─── MEMORIALS ────────────────────────────────────────────────────────────────

/**
 * POST /memorials
 * Creates a new memorial. Protected.
 * Body: { subject_name, date_of_birth, date_of_passing, cover_photo_url }
 */
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

/**
 * GET /memorials
 * Returns all memorials for the logged in organizer. Protected.
 */
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

/**
 * GET /memorials/:id
 * Returns a single memorial by ID. Protected.
 */
export async function getMemorial(id) {
  await delay(MOCK_DELAY);
  const memorial = getStoredMemorials().find((m) => m.id === id) ?? null;
  return { memorial };
}

// ─── INVITE LINK ──────────────────────────────────────────────────────────────

/**
 * POST /memorials/:id/invite-link
 * Generates a contributor invite link. Protected.
 * Body: { expires_at: string, max_uses: number }
 */
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

/**
 * PATCH /memorials/:id/invite-link
 * Deactivates or reactivates the invite link. Protected.
 * Body: { is_active: boolean }
 */
export async function updateInviteLink(memorialId, { is_active }) {
  await delay(MOCK_DELAY);
  return {
    invite_link: {
      id: MOCK_INVITE_LINK.id,
      is_active,
    },
  };
}

// ─── CONTRIBUTORS ─────────────────────────────────────────────────────────────

/**
 * GET /memorials/:id/contributors
 * Returns all contributors for a memorial. Protected.
 */
export async function getContributors(memorialId) {
  await delay(MOCK_DELAY);
  return { contributors: MOCK_CONTRIBUTORS };
}

// ─── SHARE ────────────────────────────────────────────────────────────────────

/**
 * POST /memorials/:id/share
 * Generates a viewer share link. Protected.
 */
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

// ─── AI ───────────────────────────────────────────────────────────────────────

/**
 * POST /ai/memorials/:id/generate
 * Triggers AI generation for a memorial. Protected.
 */
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

/**
 * GET /ai/jobs/:id/status
 * Polls job status. Protected.
 * Call on an interval — progress increments each call until complete.
 */
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

// frontend/src/lib/api.js
// ─────────────────────────────────────────────────────────────────────────────
// SHARED API LAYER
// Every API call in the app goes through this file.
// Contributor invite validation, session setup, relationship, questionnaire
// autosave, and submit use the real backend. Media and output fallbacks still
// use local/mock data where backend read/upload endpoints are incomplete.
// ─────────────────────────────────────────────────────────────────────────────

// mockMemorials.js is the single source of truth for mock memorial data.
// Field names match DB schema: subject_name, date_of_birth, date_of_passing, cover_photo_url
import { mockMemorials } from "@/data/mockMemorials.js";
import { getSupabaseClient } from "@/lib/supabaseClient.js";
import { normalizeShareUrl } from "@/lib/copyToClipboard.js";
import { getStore } from "@/lib/contributionStore";
import { CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS } from "@/lib/contribute/questionnaireQuestions.js";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const MOCK_DELAY = 500;
const MOCK_INVITE_TOKEN = 'mock_invite_abc123';
const CONTRIBUTOR_QUESTION_IDS = new Set(CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.map((question) => question.id));

// API base URL — reads from env for production, falls back to localhost for dev
// Set NEXT_PUBLIC_API_URL in Vercel dashboard for production deployment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LOCAL_BACKEND_API_URL = 'http://localhost:3001';

export const MAX_AUDIO_FILE_SIZE_MB = 50;
export const MAX_AUDIO_FILE_SIZE_BYTES = MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024;
export const MAX_PHOTO_FILE_SIZE_MB = 50;
export const MAX_PHOTO_FILE_SIZE_BYTES = MAX_PHOTO_FILE_SIZE_MB * 1024 * 1024;
export const MAX_CONTRIBUTOR_PHOTOS = 500;
export const PHOTO_UPLOAD_BATCH_SIZE = 20;
const ALLOWED_PHOTO_EXTENSIONS = ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp'];
export const ALLOWED_AUDIO_EXTENSIONS = ['m4a', 'mp3', 'wav', 'webm'];
const AUDIO_MIME_BY_EXTENSION = {
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  webm: 'audio/webm',
};

export class ApiRequestError extends Error {
  constructor(message, { status = 0, code = "request_error", data = null } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

async function requestJson(path, options = {}) {
  const {
    baseUrl = API_URL,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    signal: externalSignal,
    ...fetchOptions
  } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response;

  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
        ...fetchOptions.headers,
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiRequestError(
        externalSignal?.aborted
          ? "The request was cancelled."
          : "The request timed out. Check that the API is running and try again.",
        { code: "aborted" },
      );
    }

    throw new ApiRequestError("Could not reach the Remember API.", {
      code: "network_error",
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    throw new ApiRequestError(
      data?.error || data?.message || `Request failed with status ${response.status}.`,
      {
      status: response.status,
      code:
        response.status === 404
          ? "not_found"
          : response.status === 429
            ? "rate_limited"
            : "request_error",
      data,
    });
  }

  return data;
}

async function requestJsonWithRetry(path, options = {}, maxAttempts = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await requestJson(path, options);
    } catch (error) {
      lastError = error;
      if (
        error instanceof ApiRequestError &&
        error.status === 429 &&
        attempt < maxAttempts - 1
      ) {
        await delay(800 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

function isLocalFrontendApiUrl() {
  try {
    const url = new URL(API_URL);
    return (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port === '3000';
  } catch {
    return false;
  }
}

function isLocalApiUrl(baseUrl = API_URL) {
  try {
    const url = new URL(baseUrl);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

// ─── Helper to get real Supabase JWT token ────────────────────────────────────
// Used by Blessing's memorial endpoints — gets real session from Supabase Auth
// Falls back to mock session token if Supabase session not available
const SUPABASE_AUTH_STORAGE_KEY = 'sb-tbpdhybqbjucoxdizlgw-auth-token';

function parseSupabaseAuthPayload(raw) {
  if (!raw) return null;
  try {
    const decoded = raw.startsWith('base64-')
      ? JSON.parse(atob(raw.replace('base64-', '')))
      : JSON.parse(raw);
    return decoded?.access_token || decoded?.currentSession?.access_token || null;
  } catch {
    return null;
  }
}

function getAuthTokenFromCookie() {
  if (!isBrowser()) return null;
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SUPABASE_AUTH_STORAGE_KEY}=`));
  if (!cookie) return null;
  return parseSupabaseAuthPayload(decodeURIComponent(cookie.split('=').slice(1).join('=')));
}

function getAuthTokenFromLocalStorage() {
  if (!isBrowser()) return null;
  return parseSupabaseAuthPayload(window.localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY));
}

const GET_SESSION_TIMEOUT_MS = 3_000;

async function getAuthTokenFromSession() {
  try {
    const supabase = getSupabaseClient();
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise((resolve) => {
        setTimeout(() => resolve({ data: { session: null }, error: null }), GET_SESSION_TIMEOUT_MS);
      }),
    ]);
    const { data, error } = sessionResult;
    if (!error && data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch {
    // fall through
  }
  return null;
}

export async function getAuthToken() {
  const cookieToken = getAuthTokenFromCookie();
  if (cookieToken) return cookieToken;

  const storageToken = getAuthTokenFromLocalStorage();
  if (storageToken) return storageToken;

  const mockToken = getStoredSession()?.token;
  if (mockToken) return mockToken;

  const sessionToken = await getAuthTokenFromSession();
  return sessionToken || "";
}

const now = () => new Date().toISOString();
const fakeToken = () => 'mock_jwt_' + Math.random().toString(36).slice(2);
const makeId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2)}`;
const isBrowser = () => typeof window !== 'undefined';
const getFileExtension = (fileName = "") => fileName.split(".").pop()?.toLowerCase() || "";

// ─── Shared localStorage helpers (used by Blessing's auth + memorial functions) ───

const AUTH_STORAGE_KEY = 'remember.mock.auth';
const USERS_STORAGE_KEY = 'remember.mock.users';

// NOTE: MOCK_MEMORIALS_STORAGE_KEY lives in mockMemorials.js
// Blessing's functions use localStorage for memorials too — key defined here for api use
const MEMORIALS_STORAGE_KEY = 'remember.mock.memorials';

const MOCK_USER = {
  id: 'user-uuid-0000-0000-000000000001',
  email: 'organizer@example.com',
};

const MOCK_USERS = [{ ...MOCK_USER, full_name: 'Maya Hart', password: null }];

// Seed contributors for Mendrika's manage page
const MOCK_CONTRIBUTORS = [
  { id: 'contributor-uuid-000000000001', name: 'Sarah', relationship_type: 'friend', status: 'submitted', submitted_at: now() },
  { id: 'contributor-uuid-000000000002', name: 'Michael', relationship_type: 'family', status: 'submitted', submitted_at: now() },
  { id: 'contributor-uuid-000000000003', name: 'Tom Harris', relationship_type: 'colleague', status: 'in_progress', submitted_at: null },
];

// Seed invite link
const MOCK_INVITE_LINK = {
  id: 'invite-uuid-00-0000-000000000001',
  token: 'mock_invite_abc123',
  url: 'http://localhost:3000/contribute/mock_invite_abc123',
  is_active: true,
  expires_at: '2026-06-01',
  max_uses: 50,
  use_count: 3,
  created_at: now(),
};

const MOCK_CONTRIBUTOR_MEMORIAL_ID = 'mock-memorial-robert-kim';

const isLocalMockInviteToken = (token) =>
  process.env.NODE_ENV !== 'production' && token === MOCK_INVITE_TOKEN;

function getMockContributorInvite() {
  // Local dev mock invite token. Remove once real invite generation is implemented.
  return {
    invite: {
      id: MOCK_INVITE_LINK.id,
      token: MOCK_INVITE_TOKEN,
      invite_token: MOCK_INVITE_TOKEN,
      is_active: true,
      active: true,
      use_count: 0,
      expires_at: null,
      max_uses: null,
    },
    memorial: {
      id: MOCK_CONTRIBUTOR_MEMORIAL_ID,
      subject_name: 'Robert Kim',
      cover_photo_url: null,
    },
  };
}

const readStoredValue = (key, fallback) => {
  if (!isBrowser()) return fallback;
  const val = window.localStorage.getItem(key);
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { window.localStorage.removeItem(key); return fallback; }
};

const writeStoredValue = (key, value) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const clearStoredValue = (key) => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
};

// Seed mock state on first load
// Uses mockMemorials from the imported file — single source of truth
const ensureMockState = () => {
  if (!isBrowser()) return;
  if (!readStoredValue(USERS_STORAGE_KEY, null)) writeStoredValue(USERS_STORAGE_KEY, MOCK_USERS);
  if (!readStoredValue(MEMORIALS_STORAGE_KEY, null)) writeStoredValue(MEMORIALS_STORAGE_KEY, mockMemorials);
};

const getStoredUsers = () => { ensureMockState(); return readStoredValue(USERS_STORAGE_KEY, MOCK_USERS); };
const getStoredMemorials = () => { ensureMockState(); return readStoredValue(MEMORIALS_STORAGE_KEY, mockMemorials); };
const getStoredSession = () => readStoredValue(AUTH_STORAGE_KEY, null);
const setStoredSession = ({ user, token }) => writeStoredValue(AUTH_STORAGE_KEY, { user, token });
const getActiveUser = () => getStoredSession()?.user ?? MOCK_USER;

// ─── Rebecca's localStorage helpers for contributor flow ───

const RESPONSES_STORAGE_PREFIX = 'remember_questionnaire_responses';
const LEGACY_RESPONSES_STORAGE_PREFIX = 'remember_mock_questionnaire_responses';

function getResponsesStorageKey(token) { return `${RESPONSES_STORAGE_PREFIX}:${token}`; }
function getLegacyResponsesStorageKey(token) { return `${LEGACY_RESPONSES_STORAGE_PREFIX}:${token}`; }

function readStoredResponses(token) {
  if (!isBrowser()) return {};
  const storageKey = getResponsesStorageKey(token);
  const legacyStorageKey = getLegacyResponsesStorageKey(token);
  const stored = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    if (!window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, stored);
      window.localStorage.removeItem(legacyStorageKey);
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(legacyStorageKey);
    return {};
  }
}

function writeStoredResponses(token, data) {
  if (!isBrowser()) return;
  window.localStorage.setItem(getResponsesStorageKey(token), JSON.stringify(data));
}

function readStoredPhotos(token) {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(`remember_photos:${token}`) || '[]');
  } catch { return []; }
}

function writeStoredPhotos(token, photos) {
  if (!isBrowser()) return;
  window.localStorage.setItem(`remember_photos:${token}`, JSON.stringify(photos));
}

function readStoredVoice(token) {
  if (!isBrowser()) return [];
  try { return JSON.parse(window.localStorage.getItem(`remember_voice:${token}`) || '[]'); } catch { return []; }
}

function writeStoredVoice(token, recordings) {
  if (!isBrowser()) return;
  window.localStorage.setItem(`remember_voice:${token}`, JSON.stringify(recordings));
}

// Read-only — Sungjun's contributorService.js writes this key
function readContributorSession(token) {
  if (!isBrowser()) return null;
  try { return JSON.parse(window.localStorage.getItem(`remember_contributor_session:${token}`) || 'null'); } catch { return null; }
}

function validatePhotoFile(file) {
  const extension = getFileExtension(file.name);
  const hasSupportedMime = file.type?.startsWith('image/');
  const hasSupportedExtension = ALLOWED_PHOTO_EXTENSIONS.includes(extension);

  if (!hasSupportedMime && !hasSupportedExtension) {
    return 'Only JPG, PNG, WebP, HEIC, or HEIF photos can be uploaded.';
  }

  if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
    return `Photos must be smaller than ${MAX_PHOTO_FILE_SIZE_MB} MB.`;
  }

  return null;
}

function chunkFiles(files, size) {
  const chunks = [];
  for (let index = 0; index < files.length; index += size) {
    chunks.push(files.slice(index, index + size));
  }
  return chunks;
}

// ─── BLESSING: AUTH ───────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Creates a new organizer account.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function register({ email, password, full_name }) {
  await delay(MOCK_DELAY);
  const trimmedEmail = email.trim();
  const users = getStoredUsers();
  if (users.some((u) => u.email.toLowerCase() === trimmedEmail.toLowerCase())) {
    throw new Error('An account with this email already exists.');
  }
  const user = { id: makeId('user-uuid'), email: trimmedEmail, full_name: full_name ?? '' };
  const token = fakeToken();
  writeStoredValue(USERS_STORAGE_KEY, [...users, { ...user, password }]);
  setStoredSession({ user, token });
  return { user, token };
}

/**
 * POST /auth/login
 * Logs in to an existing organizer account.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function login({ email, password }) {
  await delay(MOCK_DELAY);
  const trimmedEmail = email.trim();
  const users = getStoredUsers();
  const matchingUser = users.find((u) => u.email.toLowerCase() === trimmedEmail.toLowerCase());
  if (matchingUser?.password && matchingUser.password !== password) {
    throw new Error('Invalid email or password.');
  }
  const user = matchingUser
    ? { id: matchingUser.id, email: matchingUser.email, full_name: matchingUser.full_name ?? '' }
    : { ...MOCK_USER, email: trimmedEmail || MOCK_USER.email };
  const token = fakeToken();
  setStoredSession({ user, token });
  return { user, token };
}

/**
 * POST /auth/logout
 * TODO: Replace with real fetch() on Day 9.
 */
export async function logout() {
  await delay(MOCK_DELAY / 2);
  clearStoredValue(AUTH_STORAGE_KEY);
  return { success: true };
}

/**
 * GET /auth/me
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getCurrentUser() {
  await delay(MOCK_DELAY / 2);
  return getActiveUser();
}

// ─── BLESSING: MEMORIALS ──────────────────────────────────────────────────────

/**
 * POST /memorials
 * Creates a new memorial. Protected.
 * PHASE 4: Blessing wired to real backend — using correct port 3001
 * Sends backend-aligned fields: nickname, biography, related_people
 * Falls back to mock if backend fails
 */
/**
 * POST /memorials/cover-photo
 * Uploads the memorial portrait via the API (service role storage).
 */
export async function uploadMemorialCoverPhoto(file, { signal, timeoutMs = 20_000 } = {}) {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiRequestError("You must be logged in to upload a photo.", {
      status: 401,
      code: "unauthorized",
    });
  }

  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response;
  try {
    response = await fetch(`${API_URL.replace(/\/$/, "")}/memorials/cover-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiRequestError("Photo upload timed out. Try again or continue without a photo.", {
        code: "aborted",
      });
    }
    throw new ApiRequestError("Could not reach the Remember API.", { code: "network_error" });
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(
      data?.error || data?.message || `Upload failed with status ${response.status}.`,
      {
      status: response.status,
      data,
    },
    );
  }

  return data;
}

export async function createMemorial({
  subject_name,
  nickname,
  date_of_birth,
  date_of_passing,
  biography,
  related_people,
  cover_photo_url,
}) {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiRequestError("You must be logged in to create a memorial.", {
      status: 401,
      code: "unauthorized",
    });
  }

  return requestJson("/memorials", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subject_name: subject_name?.trim() || "",
      nickname: (nickname || "").trim(),
      date_of_birth: date_of_birth ?? null,
      date_of_passing: date_of_passing ?? null,
      biography: (biography || "").trim(),
      related_people: related_people ?? [],
      cover_photo_url: cover_photo_url ?? null,
    }),
    timeoutMs: 30_000,
  });
}

/**
 * PATCH /memorials/:id — update memorial fields (e.g. cover photo after create).
 */
export async function updateMemorial(memorialId, fields) {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiRequestError("You must be logged in to update this memorial.", {
      status: 401,
      code: "unauthorized",
    });
  }

  return requestJson(`/memorials/${encodeURIComponent(memorialId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(fields),
    timeoutMs: 30_000,
  });
}

/**
 * GET /memorials
 * Returns all memorials for the logged in organizer. Protected.
 * PHASE 4: Blessing wired to real backend — using correct port 3001
 * Falls back to mock if backend fails
 */
export async function getMemorials() {
  const token = await getAuthToken();
  if (!token) {
    return { memorials: [] };
  }

  return requestJson("/memorials", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * GET /memorials/:id
 * Returns a single memorial by ID. Protected.
 * PHASE 4: Blessing wired to real backend — using correct port 3001
 * Falls back to mock if backend fails
 */
export async function getMemorial(id) {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiRequestError("You must be logged in to view this memorial.", {
      status: 401,
      code: "unauthorized",
    });
  }

  return requestJson(`/memorials/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── BLESSING: INVITE LINK ────────────────────────────────────────────────────

/**
 * POST /memorials/:id/invite-link
 * Generates a contributor invite link. Protected.
 * PHASE 4: Blessing wired to real backend — using correct port 3001
 * Falls back to mock if backend fails
 */
export async function createInviteLink(memorialId, { expires_at, max_uses } = {}) {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiRequestError("You must be logged in to create an invite link.", {
      status: 401,
      code: "unauthorized",
    });
  }

  const data = await requestJson(`/memorials/${encodeURIComponent(memorialId)}/invite-link`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ expires_at: expires_at ?? null, max_uses: max_uses ?? null }),
  });

  if (data?.invite_link?.url) {
    data.invite_link.url = normalizeShareUrl(data.invite_link.url);
  }
  if (data?.invite_link?.token === MOCK_INVITE_TOKEN) {
    throw new ApiRequestError("Received a mock invite token from the API.", { code: "invalid_response" });
  }
  return data;
}

// Alias for consistency — some pages call generateInviteLink
export const generateInviteLink = createInviteLink;

/**
 * PATCH /memorials/:id/invite-link
 * Deactivates or reactivates the invite link. Protected.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function updateInviteLink(memorialId, { is_active }) {
  await delay(MOCK_DELAY);
  return { invite_link: { id: MOCK_INVITE_LINK.id, is_active } };
}

// ─── TEAM: CONTRIBUTORS (confirm owner with team) ─────────────────────────────

/**
 * GET /memorials/:id/contributors
 * Returns all contributors for a memorial. Protected.
 * Used by Mendrika's manage page.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function getContributors(memorialId) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/memorials/${memorialId}/contributors`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch contributors');
    return response.json();
  } catch {
    // Fallback to mock — prevents constellation page from crashing
    await delay(MOCK_DELAY);
    return { contributors: MOCK_CONTRIBUTORS };
  }
}

// ─── TEAM: SHARE LINK (confirm owner with team) ───────────────────────────────

/**
 * POST /memorials/:id/share
 * Generates a viewer share link. Protected.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function createShareLink(memorialId) {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiRequestError("You must be logged in to create a share link.", {
      status: 401,
      code: "unauthorized",
    });
  }

  const data = await requestJson(`/memorials/${encodeURIComponent(memorialId)}/share`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (data?.share_link?.url) {
    data.share_link.url = normalizeShareUrl(data.share_link.url);
  }
  return data;
}

// ─── ASHWINI: AI PIPELINE ─────────────────────────────────────────────────────

/**
 * POST /ai/memorials/:id/generate
 * Triggers AI generation for a memorial. Protected.
 * Calls the real backend with a local-dev mock fallback when the API is unreachable.
 */
export async function triggerGeneration(memorialId, token) {
  const accessToken = token?.access_token || token || (await getAuthToken()) || '';
  const requestOptions = {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  };

  try {
    return await requestJson(`/ai/memorials/${encodeURIComponent(memorialId)}/generate`, requestOptions);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404 && isLocalFrontendApiUrl()) {
      try {
        return await requestJson(`/ai/memorials/${encodeURIComponent(memorialId)}/generate`, {
          ...requestOptions,
          baseUrl: LOCAL_BACKEND_API_URL,
        });
      } catch (backendError) {
        if (
          backendError instanceof ApiRequestError &&
          backendError.status > 0 &&
          backendError.status !== 404
        ) {
          throw backendError;
        }
        if (process.env.NODE_ENV === 'production') throw backendError;
      }

      await delay(MOCK_DELAY);
      _mockProgress = 0;
      return createMockGenerationJob();
    }

    if (error instanceof ApiRequestError && error.status > 0) throw error;
    if (process.env.NODE_ENV === 'production') throw error;

    await delay(MOCK_DELAY);
    _mockProgress = 0;
    return createMockGenerationJob();
  }
}

/**
 * GET /ai/jobs/:id/status
 * Polls job status. Call on an interval — progress increments each call.
 * Calls the real backend with a local-dev mock fallback when the API is unreachable.
 */
let _mockProgress = 0;

function createMockGenerationJob(status = 'queued', progress = 0, currentStep = 'Starting...') {
  return {
    job: {
      id: makeId('job-uuid'),
      status,
      progress,
      current_step: currentStep,
      error_message: null,
    },
  };
}

function createMockJobStatus(jobId) {
  _mockProgress = Math.min(_mockProgress + 20, 100);
  const steps = [
    'Starting...',
    'Reading contributor responses...',
    'Finding recurring themes...',
    'Matching photos to themes...',
    'Building the story arc...',
  ];
  const stepIndex = Math.floor((_mockProgress / 100) * steps.length);

  return {
    job: {
      id: jobId,
      status: _mockProgress < 100 ? 'processing' : 'complete',
      progress: _mockProgress,
      current_step: steps[Math.min(stepIndex, steps.length - 1)],
      error_message: null,
    },
  };
}

export async function getJobStatus(jobId, token) {
  const accessToken = token?.access_token || token || (await getAuthToken()) || '';
  const requestOptions = {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  };

  try {
    return await requestJson(`/ai/jobs/${encodeURIComponent(jobId)}/status`, requestOptions);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404 && isLocalFrontendApiUrl()) {
      try {
        return await requestJson(`/ai/jobs/${encodeURIComponent(jobId)}/status`, {
          ...requestOptions,
          baseUrl: LOCAL_BACKEND_API_URL,
        });
      } catch (backendError) {
        if (
          backendError instanceof ApiRequestError &&
          backendError.status > 0 &&
          backendError.status !== 404
        ) {
          throw backendError;
        }
        if (process.env.NODE_ENV === 'production') throw backendError;
      }

      await delay(MOCK_DELAY);
      return createMockJobStatus(jobId);
    }

    if (error instanceof ApiRequestError && error.status > 0) throw error;
    if (process.env.NODE_ENV === 'production') throw error;

    await delay(MOCK_DELAY);
    return createMockJobStatus(jobId);
  }
}

// ─── REBECCA + SUNGJUN: CONTRIBUTE FLOW ──────────────────────────────────────

/**
 * GET /contribute/:token
 * Validates invite token, returns memorial details for landing page.
 */
export async function getInviteToken(token) {
  if (isLocalMockInviteToken(token)) {
    await delay(MOCK_DELAY / 2);
    return getMockContributorInvite();
  }

  return requestJson(`/contribute/${encodeURIComponent(token)}`);
}

/**
 * POST /contribute/:token/start
 * Creates contributor row, returns contributor session token.
 * Body: { name: string }
 */
export async function startContribution(token, name) {
  if (isLocalMockInviteToken(token)) {
    await delay(MOCK_DELAY / 2);
    const contributorId = makeId('mock-contributor');

    return {
      contributor: {
        id: contributorId,
        memorial_id: MOCK_CONTRIBUTOR_MEMORIAL_ID,
        name: name.trim(),
        status: 'in_progress',
      },
      contributor_token: `mock-contributor-token-${contributorId}`,
    };
  }

  return requestJson(`/contribute/${encodeURIComponent(token)}/start`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

/**
 * POST /contribute/:token/relationship
 * Saves relationship type to contributors table.
 * Body: { contributor_token, relationship_type, relationship_label? }
 */
export async function saveRelationship(token, relationshipInput) {
  if (isLocalMockInviteToken(token)) {
    await delay(MOCK_DELAY / 2);

    return {
      contributor: {
        id: relationshipInput.contributor_token,
        relationship_type: relationshipInput.relationship_type,
        relationship_label: relationshipInput.relationship_label ?? null,
      },
    };
  }

  return requestJson(`/contribute/${encodeURIComponent(token)}/relationship`, {
    method: "POST",
    body: JSON.stringify({
      contributor_token: relationshipInput.contributor_token,
      relationship_type: relationshipInput.relationship_type,
      relationship_label: relationshipInput.relationship_label ?? null,
    }),
  });
}

/**
 * POST /contribute/:token/responses
 * Saves questionnaire Q&A. Supports partial saves (autosave).
 * Mirrors successful saves to localStorage only as a temporary resume/review
 * fallback until the backend exposes saved questionnaire responses.
 */
export async function saveResponses(token, responses, options = {}) {
  const contributorToken =
    options.contributorToken ?? responses?.[0]?.contributor_token ?? responses?.[0]?.contributor_id;

  if (!contributorToken) {
    throw new ApiRequestError("A contributor session is required before saving responses.", {
      code: "missing_contributor_token",
    });
  }

  const apiResponses = responses.map((response) => ({
    question_text: response.question_text ?? response.question_id,
    response_text: response.response_text ?? response.answer_text ?? "",
    order_index: response.order_index ?? response.question_order,
  }));

  if (isLocalMockInviteToken(token)) {
    await delay(MOCK_DELAY / 2);

    const timestamp = now();
    const responsesByContributor = readStoredResponses(token);
    const savedResponses = [];

    responses.forEach((response) => {
      const contributorId = response?.contributor_id ?? contributorToken;
      const questionId = response?.question_id;

      if (!contributorId || !questionId) return;

      const contributorResponses = responsesByContributor[contributorId] ?? {};
      const savedResponse = {
        ...response,
        contributor_id: contributorId,
        contributor_token: contributorToken,
        invite_token: token,
        saved_at: timestamp,
      };
      contributorResponses[questionId] = savedResponse;
      responsesByContributor[contributorId] = contributorResponses;
      savedResponses.push(savedResponse);
    });

    writeStoredResponses(token, responsesByContributor);
    return { success: true, saved: savedResponses.length, responses: savedResponses };
  }

  const result = await requestJsonWithRetry(`/contribute/${encodeURIComponent(token)}/responses`, {
    method: "POST",
    signal: options.signal,
    body: JSON.stringify({
      contributor_token: contributorToken,
      responses: apiResponses,
    }),
  });

  if (result?.saved !== true) {
    throw new ApiRequestError("The Remember API did not confirm the response was saved.", {
      code: "unexpected_response",
      data: result,
    });
  }

  const timestamp = now();
  const responsesByContributor = readStoredResponses(token);
  const savedResponses = [];

  responses.forEach((response) => {
    if (!response?.contributor_id || !response?.question_id) return;
    const contributorResponses = responsesByContributor[response.contributor_id] ?? {};
    const savedResponse = { ...response, invite_token: token, saved_at: response.saved_at ?? timestamp };
    contributorResponses[response.question_id] = savedResponse;
    responsesByContributor[response.contributor_id] = contributorResponses;
    savedResponses.push(savedResponse);
  });

  writeStoredResponses(token, responsesByContributor);
  return { success: true, saved: savedResponses.length, responses: savedResponses };
}

/**
 * Returns same-browser draft responses for one contributor session.
 *
 * Dev note: backend-backed questionnaire resume is blocked until the API
 * exposes a real saved responses endpoint. Do not call a fake GET route here.
 */
export async function getResponses(token, contributorInput) {
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
 * Uploads contributor photos through the backend media endpoint.
 * The caller owns temporary preview URLs; persisted draft data only stores
 * backend-confirmed asset records so refreshes do not revive stale blob URLs.
 *
 * Backend expects: multipart/form-data with files[] and contributor_token fields.
 * Backend returns:  { uploaded, files: [...], errors: [] }
 *                   207 for partial success, 400/4xx for full failure.
 */
async function uploadPhotoBatch(token, contributorToken, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files[]', file));
  formData.append('contributor_token', contributorToken);

  let response;

  try {
    response = await fetch(`${API_URL}/contribute/${encodeURIComponent(token)}/photos`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiRequestError('The upload was cancelled.', { code: 'aborted' });
    }
    throw new ApiRequestError('Could not reach the Remember API to upload photos.', {
      code: 'network_error',
    });
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  // 207 = partial success (some files uploaded, some failed) — treat as ok
  if (!response.ok && response.status !== 207) {
    let errorMessage = data?.error || `Photo upload failed with status ${response.status}.`;
    let errorCode = data?.code || 'photo_upload_failed';

    if (response.status === 413 || data?.code === 'file_too_large') {
      errorMessage = data?.error || 'One or more files are too large. Maximum file size is 50 MB.';
      errorCode = data?.code || 'file_too_large';
    }

    if (data?.code === 'photo_limit_exceeded') {
      const remaining = Number.isFinite(data.remaining) ? data.remaining : 0;
      errorMessage = `${data.error} You can add ${remaining} more ${remaining === 1 ? 'photo' : 'photos'}.`;
    }

    throw new ApiRequestError(errorMessage, {
      status: response.status,
      code: errorCode,
      data,
    });
  }

  return { response, data };
}

export async function uploadPhotos(token, files, { onProgress } = {}) {
  const session = readContributorSession(token);
  const contributorToken = session?.contributorToken || session?.contributorId;
  const fileList = Array.from(files || []);

  if (!contributorToken) {
    throw new ApiRequestError("A contributor session is required before uploading photos.", {
      code: "missing_contributor_token",
    });
  }

  if (!fileList.length) {
    throw new ApiRequestError('At least one photo file is required.', {
      status: 400,
      code: 'photo_validation_failed',
    });
  }

  // ── Mock path ──────────────────────────────────────────────────────────────
  if (isLocalMockInviteToken(token)) {
    await delay(MOCK_DELAY / 2);

    const errors = [];
    const validFiles = [];

    fileList.forEach((file) => {
      const validationError = validatePhotoFile(file);
      if (validationError) {
        errors.push({ file_name: file.name || 'photo', error: validationError });
      } else {
        validFiles.push(file);
      }
    });

    const existing = readStoredPhotos(token);
    const remainingPhotoSlots = MAX_CONTRIBUTOR_PHOTOS - existing.length;

    if (validFiles.length > remainingPhotoSlots) {
      throw new ApiRequestError(
        `This contribution can include up to ${MAX_CONTRIBUTOR_PHOTOS} photos. You can add ${Math.max(remainingPhotoSlots, 0)} more.`,
        {
          status: 409,
          code: 'photo_limit_exceeded',
          data: {
            max_photos: MAX_CONTRIBUTOR_PHOTOS,
            uploaded_count: existing.length,
            remaining: Math.max(remainingPhotoSlots, 0),
          },
        },
      );
    }

    if (!validFiles.length) {
      throw new ApiRequestError(errors[0]?.error || 'At least one photo file is required.', {
        status: 400,
        code: 'photo_validation_failed',
        data: { errors },
      });
    }

    const timestamp = Date.now();
    const localAssets = validFiles.map((file, index) => ({
      id: `photo-${timestamp}-${index}-${Math.random().toString(36).slice(2)}`,
      file_name: file.name || `Photo ${index + 1}`,
      file_type: file.type || '',
      file_size_bytes: file.size || 0,
      storage_path: null,
      storage_bucket: 'local-mock',
      taken_at: null,
      caption: null,
      previewUrl: null,
    }));

    writeStoredPhotos(token, [...existing, ...localAssets]);

    return {
      success: true,
      uploaded: localAssets.length,
      assets: localAssets,
      errors,
      partialFailure: errors.length > 0,
    };
  }

  // ── Real backend path ──────────────────────────────────────────────────────
  const batches = chunkFiles(fileList, PHOTO_UPLOAD_BATCH_SIZE);
  const finalAssets = [];
  const allErrors = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];

    try {
      const { response, data } = await uploadPhotoBatch(token, contributorToken, batch);

      // Backend returns { uploaded, files: [...], errors: [] }
      const backendAssets = Array.isArray(data?.files)
        ? data.files.filter((f) => f?.id && f?.file_name)
        : [];

      if (!backendAssets.length) {
        throw new ApiRequestError(
          'The Remember API responded, but did not confirm that any photos were saved.',
          { status: response.status, code: 'upload_not_confirmed', data }
        );
      }

      const batchAssets = backendAssets.map((file, index) => {
        const originalFile = batch[index];
        const remoteUrl = file.url || file.photo_url || null;
        let previewUrl = remoteUrl;
        if (!previewUrl && originalFile) {
          try { previewUrl = URL.createObjectURL(originalFile); } catch {}
        }
        return {
          id: file.id,
          file_name: file.file_name,
          file_type: file.file_type ?? originalFile?.type ?? '',
          file_size_bytes: file.file_size_bytes ?? originalFile?.size ?? 0,
          storage_path: file.storage_path,
          storage_bucket: file.storage_bucket ?? 'memorial-assets',
          taken_at: file.taken_at ?? null,
          caption: file.caption ?? null,
          url: remoteUrl,
          previewUrl,
        };
      });

      finalAssets.push(...batchAssets);
      if (Array.isArray(data?.errors)) allErrors.push(...data.errors);
      onProgress?.({
        uploaded: finalAssets.length,
        total: fileList.length,
        batch: batchIndex + 1,
        batches: batches.length,
      });
    } catch (error) {
      if (!finalAssets.length) throw error;

      allErrors.push({
        file_name: `Batch ${batchIndex + 1}`,
        error: error instanceof Error ? error.message : 'Upload failed.',
      });
      break;
    }
  }

  const existing = readStoredPhotos(token);
  writeStoredPhotos(token, [...existing, ...finalAssets]);

  return {
    success: true,
    uploaded: finalAssets.length,
    assets: finalAssets,
    errors: allErrors,
    partialFailure: allErrors.length > 0,
  };
}

/**
 * POST /contribute/:token/voice
 * Uploads a contributor voice recording with required title metadata.
 * Mock invite flows still use same-browser draft storage when the API is not available.
 */
export async function uploadVoice(token, file, contributorTitle) {
  if (!contributorTitle || contributorTitle.trim() === '') {
    throw new ApiRequestError('Please add a title for this recording.', {
      code: "voice_title_required",
    });
  }

  if (!file) {
    throw new ApiRequestError('Please choose an audio file.', {
      code: "voice_file_required",
    });
  }

  const extension = getFileExtension(file.name);
  const hasSupportedMime = file.type?.startsWith('audio/');
  const hasSupportedExtension = ALLOWED_AUDIO_EXTENSIONS.includes(extension);

  if (!hasSupportedMime && !hasSupportedExtension) {
    throw new ApiRequestError('This file type is not supported. Please upload an M4A, MP3, or WAV file.', {
      code: "unsupported_audio_type",
    });
  }

  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    throw new ApiRequestError('This file is too large. Please choose a smaller audio file.', {
      code: "audio_too_large",
    });
  }

  const session = readContributorSession(token);
  const contributorToken = session?.contributorToken || session?.contributorId;
  const mimeType = file.type || AUDIO_MIME_BY_EXTENSION[extension] || '';

  // Always build local recording object for UI display
  const localRecording = {
    id: `voice-${Date.now()}`,
    contributor_title: contributorTitle.trim(),
    file_name: file.name,
    file_type: mimeType,
    file_size_bytes: file.size,
    storage_path: null,
    storage_bucket: 'memorial-assets',
    duration_seconds: 0,
  };

  try {
    // Call real backend — marks voice_done=true in contributors table
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contributor_title', contributorTitle.trim());
    if (contributorToken) formData.append('contributor_token', contributorToken);

    const response = await fetch(`${API_URL}/contribute/${encodeURIComponent(token)}/voice`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const recording = {
        id: data.recording?.id || localRecording.id,
        contributor_title: data.recording?.contributor_title || contributorTitle.trim(),
        file_name: data.recording?.file_name || file.name,
        file_type: data.recording?.file_type || mimeType,
        file_size_bytes: data.recording?.file_size_bytes ?? file.size,
        storage_path: data.recording?.storage_path || null,
        storage_bucket: data.recording?.storage_bucket || 'memorial-assets',
        duration_seconds: data.recording?.duration_seconds || 0,
      };

      const existing = readStoredVoice(token);
      writeStoredVoice(token, [...existing, recording]);
      return { success: true, recording };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    throw new ApiRequestError(data?.error || 'Upload failed. Please try again.', {
      status: response.status,
      code: "voice_upload_failed",
      data,
    });
  } catch (error) {
    const canUseLocalFallback =
      token === MOCK_INVITE_TOKEN ||
      token?.startsWith('mock_') ||
      (process.env.NODE_ENV !== 'production' && !(error instanceof ApiRequestError));

    if (canUseLocalFallback) {
      // Preserve same-browser draft behavior for mock/local dev when the API is unreachable.
      const existing = readStoredVoice(token);
      writeStoredVoice(token, [...existing, localRecording]);
      return { success: true, recording: localRecording };
    }

    if (error instanceof ApiRequestError) throw error;

    throw new ApiRequestError('Upload failed. Please try again.', {
      code: "network_error",
    });
  }
}

/**
 * DELETE /contribute/:token/photos/:assetId
 * Removes a photo before submission and mirrors the local draft state.
 */
export async function deletePhoto(token, assetId) {
  const session = readContributorSession(token);
  const contributorToken = session?.contributorToken || session?.contributorId;

  if (contributorToken && !String(assetId).startsWith('photo-')) {
    await requestJson(`/contribute/${encodeURIComponent(token)}/photos/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
      body: JSON.stringify({ contributor_token: contributorToken }),
    });
  }

  const existing = readStoredPhotos(token);
  writeStoredPhotos(token, existing.filter((p) => p.id !== assetId));
  return { success: true };
}

/**
 * DELETE /contribute/:token/voice/:recordingId
 * Removes a voice recording before submission. Also removes from localStorage.
 * TODO: Replace with real fetch() on Day 9.
 */
export async function deleteVoice(token, recordingId) {
  await delay(MOCK_DELAY);
  const existing = readStoredVoice(token);
  writeStoredVoice(token, existing.filter((r) => r.id !== recordingId));
  return { success: true };
}

/**
 * Returns the same-browser contributor draft summary for the review screen.
 *
 * Backend-backed review/resume is blocked until the API exposes saved response
 * and media read endpoints. Do not call fake GET contribution endpoints here.
 */
export async function fetchContributorPhotos(token, contributorToken) {
  if (!contributorToken || isLocalMockInviteToken(token)) {
    return readStoredPhotos(token);
  }

  try {
    const data = await requestJson(
      `/contribute/${encodeURIComponent(token)}/photos?contributor_token=${encodeURIComponent(contributorToken)}`,
    );
    const photos = (data?.photos || []).map((photo) => ({
      id: photo.id,
      file_name: photo.file_name,
      file_type: photo.file_type ?? '',
      file_size_bytes: photo.file_size_bytes ?? 0,
      storage_path: photo.storage_path,
      storage_bucket: photo.storage_bucket ?? 'memorial-assets',
      taken_at: photo.taken_at ?? null,
      caption: photo.caption ?? null,
      url: photo.url || photo.photo_url || null,
      previewUrl: photo.url || photo.photo_url || null,
      previewFailed: false,
    }));
    writeStoredPhotos(token, photos);
    return photos;
  } catch {
    return readStoredPhotos(token);
  }
}

export async function getContributorSummary(token) {
  const session = readContributorSession(token);
  const store = getStore();
  const contributorToken = session?.contributorToken || session?.contributorId;

  // Check in-memory store first — used when photos/page.jsx uses addPhotos
  // Fall back to localStorage — used when backend upload path writes via writeStoredPhotos
  let photos;
  if (store.photos.length > 0) {
    photos = store.photos.map((p) => ({
      id: p.id,
      file_name: p.file?.name || '',
      previewUrl: p.previewUrl,
      caption: p.caption ?? null,
    }));
  } else {
    const savedPhotos = contributorToken
      ? await fetchContributorPhotos(token, contributorToken)
      : readStoredPhotos(token);

    photos = savedPhotos.map((p) => ({
      id: p.id,
      file_name: p.file_name || '',
      previewUrl: p.previewUrl || p.url || null,
      caption: p.caption ?? null,
    }));
  }

  // Same for voice
  let voice;
  if (store.voice.length > 0) {
    voice = store.voice.map((r) => ({
      id: r.id,
      contributor_title: r.title,
      file_name: r.file?.name || '',
      previewUrl: r.previewUrl,
      duration_seconds: 0,
    }));
  } else {
    voice = readStoredVoice(token);
  }

  const contributorId = session?.contributorId ?? null;
  const responsesByContributor = readStoredResponses(token);
  const contributorResponses = contributorId ? responsesByContributor[contributorId] ?? {} : {};
  const responses = Object.values(contributorResponses)
    .filter((r) => CONTRIBUTOR_QUESTION_IDS.has(r.question_id))
    .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
    .map((r) => ({
      question_text: r.question_text || r.question_id || 'Question',
      response_text: r.answer_text || r.response_text || '',
    }));

  return {
    contributor: {
      id: contributorId,
      name: session?.contributorName || '',
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
 * Finalizes the contribution and marks the contributor submitted.
 */
export async function submitContribution(token, contributorToken) {
  if (!contributorToken) {
    throw new ApiRequestError("A contributor session is required before submitting.", {
      code: "missing_contributor_token",
    });
  }

  if (isLocalMockInviteToken(token)) {
    await delay(MOCK_DELAY / 2);

    const submittedAt = now();
    const session = readContributorSession(token);
    const contributor = {
      id: session?.contributorId ?? contributorToken,
      status: "submitted",
      submitted_at: submittedAt,
    };

    if (session) {
      writeStoredValue(`remember_contributor_session:${token}`, {
        ...session,
        status: contributor.status,
        submittedAt: contributor.submitted_at,
        updatedAt: contributor.submitted_at,
      });
    }

    return { contributor };
  }

  const submitPath = `/contribute/${encodeURIComponent(token)}/submit`;
  const submitOptions = {
    method: "POST",
    body: JSON.stringify({
      contributor_token: contributorToken,
    }),
  };

  let result;

  try {
    result = await requestJson(submitPath, submitOptions);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404 && isLocalFrontendApiUrl()) {
      result = await requestJson(submitPath, {
        ...submitOptions,
        baseUrl: LOCAL_BACKEND_API_URL,
      });
    } else {
      throw error;
    }
  }

  const submittedContributor = result?.contributor;

  if (
    !submittedContributor?.id ||
    submittedContributor.status !== "submitted" ||
    !submittedContributor.submitted_at
  ) {
    throw new ApiRequestError("The Remember API did not confirm the contribution was submitted.", {
      code: "unexpected_response",
      data: result,
    });
  }

  const session = readContributorSession(token);

  if (session) {
    writeStoredValue(`remember_contributor_session:${token}`, {
      ...session,
      status: submittedContributor.status,
      submittedAt: submittedContributor.submitted_at,
      updatedAt: submittedContributor.submitted_at,
    });
  }

  return result;
}

// ─── REBECCA: OUTPUT TABS (viewer experience) ─────────────────────────────────

const mockStoryPhotoUrls = {
  kitchenTable: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1800&q=80',
  quietDevotion: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
  everydayJoy: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80',
};

const mockVoiceAudioUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

function getMockMemorialOutput() {
  return {
    story: [
      {
        order_index: 1,
        photo_id: 'photo-uuid-1',
        photo_url: mockStoryPhotoUrls.kitchenTable,
        matched_quote: 'He always made everyone feel like the most important person in the room.',
        contributor_name: 'Sarah',
        relationship_type: 'friend',
        theme_label: 'Warmth',
      },
      {
        order_index: 2,
        photo_id: 'photo-uuid-2',
        photo_url: mockStoryPhotoUrls.quietDevotion,
        matched_quote: 'Dad would wake up at 5am just to make sure everyone had a packed lunch.',
        contributor_name: 'Michael',
        relationship_type: 'family',
        theme_label: 'Quiet Devotion',
      },
      {
        order_index: 3,
        photo_id: 'photo-uuid-3',
        photo_url: mockStoryPhotoUrls.everydayJoy,
        matched_quote: 'The way he laughed — you could hear it from three rooms away.',
        contributor_name: 'Tom',
        relationship_type: 'friend',
        theme_label: 'Joy',
      },
    ],
    constellation: {
      nodes: [
        { id: 'theme-uuid-1', label: 'The Morning Routines', category: 'daily_life', summary: 'Three contributors independently described rituals around morning.', prominence_score: 0.85, quotes: [{ text: 'He made coffee for everyone before they even woke up.', contributor_name: 'Sarah', relationship_type: 'friend' }], photo_ids: [] },
        { id: 'theme-uuid-2', label: 'Warmth at the Table', category: 'relationships', summary: 'Multiple contributors recalled the feeling of being welcomed.', prominence_score: 0.72, quotes: [{ text: 'His table always had room for one more.', contributor_name: 'Tom', relationship_type: 'friend' }], photo_ids: [] },
      ],
      edges: [{ source: 'theme-uuid-1', target: 'theme-uuid-2', relationship_type: 'family', weight: 2 }],
    },
    voices: [
      {
        id: 'voice-uuid-1',
        contributor_title: 'Voicemail from Christmas 2019',
        key_quote: 'I just called to say I love you all. Merry Christmas.',
        ai_category: 'Everyday Love',
        ai_tags: ['holiday', 'love', 'family'],
        contributor_name: 'Sarah',
        relationship_type: 'family',
        transcript_text: "Hey it's dad, just calling to say Merry Christmas. Hope you're all having a good one. I just called to say I love you all. Merry Christmas. See you for dinner.",
        transcript_segments: [
          { start: 0, end: 12, text: "Hey it's dad, just calling to say Merry Christmas." },
          { start: 12, end: 29, text: "Hope you're all having a good one. I just called to say I love you all." },
          { start: 29, end: 47.3, text: 'Merry Christmas. See you for dinner.' },
        ],
        audio_url: mockVoiceAudioUrl,
        duration_seconds: 47.3,
      },
      {
        id: 'voice-uuid-2',
        contributor_title: 'Voice note about the garden - June 2022',
        key_quote: "The tomatoes are finally coming in. I've been waiting all summer for these.",
        ai_category: 'Everyday Joy',
        ai_tags: ['garden', 'summer', 'patience'],
        contributor_name: 'Tom',
        relationship_type: 'friend',
        transcript_text: "Just wanted to record this. The tomatoes are finally coming in. I've been waiting all summer for these. Beautiful. Your grandmother would have loved them.",
        audio_url: mockVoiceAudioUrl,
        duration_seconds: 28.1,
      },
    ],
    photos: [
      { album_name: 'The Kitchen Table Years', cover_photo_url: null, photos: [{ id: 'photo-uuid-1', url: null, caption: null, taken_at: '2019-12-25', contributor_name: 'Sarah' }, { id: 'photo-uuid-2', url: null, caption: 'Summer BBQ', taken_at: '2018-07-04', contributor_name: 'Michael' }] },
      { album_name: 'The Garden in Every Season', cover_photo_url: null, photos: [{ id: 'photo-uuid-3', url: null, caption: null, taken_at: '2022-06-15', contributor_name: 'Tom' }] },
    ],
  };
}

/**
 * GET /memorials/:id/output
 * Returns complete four-tab JSON for the memorial output page.
 * PHASE 4: Now calls real backend at http://localhost:3001
 * CONFIRMED by Ashwini: returns { story, constellation, voices, photos } only
 * Memorial header fetched separately via getMemorial()
 * Falls back to mock data if backend call fails (token not in DB yet)
 */
export async function getMemorialOutput(memorialId) {
  const token = await getAuthToken();
  if (!token) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${API_URL}/memorials/${encodeURIComponent(memorialId)}/output`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Output not found");
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET /share/:shareToken
 * Viewer-only access — returns four tabs only, no memorial wrapper.
 * PHASE 4: Now calls real backend at http://localhost:3001
 * CONFIRMED by Ashwini: returns { story, constellation, voices, photos } only
 * Memorial header data (name, dates, photo) comes from GET /memorials/:id separately
 * Invalid token returns 404
 */
export async function getShareToken(shareToken) {
  if (shareToken === 'invalid') throw new Error('This share link is invalid or has expired');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${API_URL}/share/${encodeURIComponent(shareToken)}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error('This share link is invalid or has expired');
      throw new Error('Failed to load memorial');
    }

    const data = await response.json();

    // Backend returns just { story, constellation, voices, photos }
    // Memorial header data fetched separately in the share page component
    // using GET /memorials/:id — see share/page.jsx
    return data;
  } catch (error) {
    if (shareToken === 'invalid' || error.message === 'This share link is invalid or has expired') {
      throw error;
    }
    if (error?.name === 'AbortError') {
      throw new Error('Loading the memorial timed out. Please try again.');
    }

    await delay(MOCK_DELAY);
    return getMockMemorialOutput();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET /memorials/:id (used by output page + share page for header data)
 * PHASE 4: Now calls real backend at http://localhost:3001
 * CONFIRMED by Ashwini: output and share endpoints do NOT include memorial info
 * Both pages must call this separately to get subject_name, dates, cover_photo_url
 * Falls back to mockMemorials if backend fails or memorial not in DB yet
 */
export async function getMemorialById(memorialId) {
  const token = await getAuthToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${API_URL}/memorials/${encodeURIComponent(memorialId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });

    if (!response.ok) throw new Error("Memorial not found");

    const data = await response.json();
    return data.memorial;
   } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

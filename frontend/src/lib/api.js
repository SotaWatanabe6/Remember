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
import { getStore, clearStore } from "@/lib/contributionStore";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const MOCK_DELAY = 500;

// API base URL — reads from env for production, falls back to localhost for dev
// Set NEXT_PUBLIC_API_URL in Vercel dashboard for production deployment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiRequestError extends Error {
  constructor(message, { status = 0, code = "request_error", data = null } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function requestJson(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL.replace(/\/$/, "")}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiRequestError("The request was cancelled.", { code: "aborted" });
    }
    throw new ApiRequestError("Could not reach the Remember API.", { code: "network_error" });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    throw new ApiRequestError(data?.error || `Request failed with status ${response.status}.`, {
      status: response.status,
      code: response.status === 404 ? "not_found" : "request_error",
      data,
    });
  }

  return data;
}

// ─── Helper to get real Supabase JWT token ────────────────────────────────────
// Used by Blessing's memorial endpoints — gets real session from Supabase Auth
// Falls back to mock session token if Supabase session not available
async function getAuthToken() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session?.access_token) {
      return data.session.access_token;
    }
  } catch {
    // Supabase not available — fall through to mock
  }
  return getStoredSession()?.token || '';
}

const now = () => new Date().toISOString();
const fakeToken = () => 'mock_jwt_' + Math.random().toString(36).slice(2);
const makeId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2)}`;
const isBrowser = () => typeof window !== 'undefined';

// ─── Shared localStorage helpers ─────────────────────────────────────────────

const AUTH_STORAGE_KEY = 'remember.mock.auth';
const USERS_STORAGE_KEY = 'remember.mock.users';
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

// ─── Rebecca's localStorage helpers for contributor flow ─────────────────────

// Supports legacy key migration — Sungjun updated prefix in Phase 4
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
  try { return JSON.parse(window.localStorage.getItem(`remember_photos:${token}`) || '[]'); } catch { return []; }
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

// ─── BLESSING: AUTH ───────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Creates a new organizer account.
 * Note: Blessing's pages use authService.js (Supabase directly) for real auth.
 * This mock is kept for local dev without a live backend.
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
 * Note: Blessing's pages use authService.js (Supabase directly) for real auth.
 * This mock is kept for local dev without a live backend.
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

export async function logout() {
  await delay(MOCK_DELAY / 2);
  clearStoredValue(AUTH_STORAGE_KEY);
  return { success: true };
}

export async function getCurrentUser() {
  await delay(MOCK_DELAY / 2);
  return getActiveUser();
}

// ─── BLESSING: MEMORIALS ──────────────────────────────────────────────────────

/**
 * POST /memorials — Protected.
 * Real fetch to backend. Falls back to mock if backend fails.
 */
export async function createMemorial({
  subject_name,
  nickname,
  date_of_birth,
  date_of_passing,
  biography,
  related_people,
  cover_photo_url,
}) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/memorials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        subject_name: subject_name?.trim() || '',
        nickname: (nickname || '').trim(),
        date_of_birth: date_of_birth ?? null,
        date_of_passing: date_of_passing ?? null,
        biography: (biography || '').trim(),
        related_people: related_people ?? [],
        cover_photo_url: cover_photo_url ?? null,
      }),
    });
    if (!response.ok) throw new Error('Failed to create memorial');
    return response.json();
  } catch {
    await delay(MOCK_DELAY);
    const currentUser = getActiveUser();
    const createdAt = now();
    const normalizedBiography = (biography || '').trim();
    const memorial = {
      id: makeId('memorial'),
      user_id: currentUser.id,
      subject_name: subject_name?.trim() || '',
      nickname: (nickname || '').trim(),
      biography: normalizedBiography,
      description: normalizedBiography,
      related_people: related_people ?? [],
      date_of_birth: date_of_birth ?? null,
      date_of_passing: date_of_passing ?? null,
      cover_photo_url: cover_photo_url ?? null,
      status: 'collecting',
      created_at: createdAt,
      updated_at: createdAt,
    };
    writeStoredValue(MEMORIALS_STORAGE_KEY, [memorial, ...getStoredMemorials()]);
    return { memorial };
  }
}

/**
 * GET /memorials — Protected.
 * Real fetch to backend. Falls back to mock if backend fails.
 */
export async function getMemorials() {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/memorials`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch memorials');
    return response.json();
  } catch {
    await delay(MOCK_DELAY);
    const currentUser = getActiveUser();
    return {
      memorials: getStoredMemorials()
        .filter((m) => m.user_id === currentUser.id)
        .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()),
    };
  }
}

/**
 * GET /memorials/:id — Protected.
 * Real fetch to backend. Falls back to mock if backend fails.
 */
export async function getMemorial(id) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/memorials/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch memorial');
    return response.json();
  } catch {
    await delay(MOCK_DELAY);
    const memorial = getStoredMemorials().find((m) => m.id === id) ?? null;
    return { memorial };
  }
}

// ─── BLESSING: INVITE LINK ────────────────────────────────────────────────────

/**
 * POST /memorials/:id/invite-link — Protected.
 * Real fetch to backend. Falls back to mock if backend fails.
 */
export async function createInviteLink(memorialId, { expires_at, max_uses } = {}) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/memorials/${memorialId}/invite-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ expires_at: expires_at ?? null, max_uses: max_uses ?? null }),
    });
    if (!response.ok) throw new Error('Failed to create invite link');
    return response.json();
  } catch {
    await delay(MOCK_DELAY);
    return {
      invite_link: {
        ...MOCK_INVITE_LINK,
        id: makeId('invite-uuid'),
        expires_at,
        max_uses,
        created_at: now(),
      },
    };
  }
}

// Alias for consistency — some pages call generateInviteLink
export const generateInviteLink = createInviteLink;

/**
 * PATCH /memorials/:id/invite-link — Protected.
 * TODO: Wire to real backend when Mendrika needs it.
 */
export async function updateInviteLink(memorialId, { is_active }) {
  await delay(MOCK_DELAY);
  return { invite_link: { id: MOCK_INVITE_LINK.id, is_active } };
}

// ─── MENDRIKA: CONTRIBUTORS + AI ─────────────────────────────────────────────

/**
 * GET /memorials/:id/contributors — Protected.
 * Used by Mendrika's manage page and constellation component.
 * Real fetch to backend. Falls back to mock if backend fails.
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

/**
 * POST /memorials/:id/share — Protected.
 * TODO: Wire to real backend when share link generation is built.
 */
export async function createShareLink(memorialId) {
  await delay(MOCK_DELAY);
  const token = 'mock_share_' + Math.random().toString(36).slice(2);
  return { share_link: { token, url: `http://localhost:3000/share/${token}` } };
}

/**
 * POST /ai/memorials/:id/generate — Protected.
 * Used by Mendrika's generate button on manage page.
 * Real fetch to backend. Falls back to mock job if backend fails.
 */
export async function triggerGeneration(memorialId) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/ai/memorials/${memorialId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed to trigger generation: ${response.status}`);
    return response.json();
  } catch {
    // Fallback to mock job so generate button doesn't crash
    await delay(MOCK_DELAY);
    return {
      job: {
        id: makeId('job-uuid'),
        status: 'queued',
        progress: 0,
        current_step: 'Starting...',
        error_message: null,
      },
    };
  }
}

/**
 * GET /ai/jobs/:id/status — Protected.
 * Polls generation job progress. Mock increments progress each call.
 * TODO: Wire to real backend when AI pipeline is running.
 */
let _mockProgress = 0;
export async function getJobStatus(jobId) {
  await delay(MOCK_DELAY);
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

// ─── SUNGJUN + REBECCA: CONTRIBUTE FLOW ──────────────────────────────────────
// Sungjun owns: getInviteToken, startContribution, saveRelationship,
//               saveResponses, getResponses, submitContribution
// Rebecca owns: uploadPhotos, uploadVoice, deletePhoto, deleteVoice,
//               getContributorSummary

/**
 * GET /contribute/:token
 * Validates invite token — returns { memorial, invite }.
 */
export async function getInviteToken(token) {
  return requestJson(`/contribute/${encodeURIComponent(token)}`);
}

/**
 * POST /contribute/:token/start
 * Creates contributor row, returns { contributor, contributor_token }.
 */
export async function startContribution(token, name) {
  return requestJson(`/contribute/${encodeURIComponent(token)}/start`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

/**
 * POST /contribute/:token/relationship
 * Saves relationship type. Body: { contributor_token, relationship_type, relationship_label }
 */
export async function saveRelationship(token, relationshipInput) {
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
 * Mirrors successful saves to localStorage as fallback for review page resume.
 */
export async function saveResponses(token, responses, options = {}) {
  const contributorToken =
    options.contributorToken ?? responses?.[0]?.contributor_token ?? responses?.[0]?.contributor_id;

  const apiResponses = responses.map((response) => ({
    question_text: response.question_text ?? response.question_id,
    response_text: response.response_text ?? response.answer_text ?? "",
    order_index: response.order_index ?? response.question_order,
  }));

  const result = await requestJson(`/contribute/${encodeURIComponent(token)}/responses`, {
    method: "POST",
    signal: options.signal,
    body: JSON.stringify({ contributor_token: contributorToken, responses: apiResponses }),
  });

  if (result?.saved !== true) {
    throw new ApiRequestError("The Remember API did not confirm the response was saved.", {
      code: "unexpected_response",
      data: result,
    });
  }

  // Mirror to localStorage for review page resume fallback
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
 * Reads draft responses from localStorage.
 * Backend doesn't expose a saved responses endpoint yet.
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
 * Real fetch to backend — marks photos_done=true in contributors table.
 * Also saves local preview URLs so review page shows thumbnails immediately.
 * Real file storage handled by Daniel's upload system when merged.
 */
export async function uploadPhotos(token, files) {
  const session = readContributorSession(token);
  const contributorToken = session?.contributorToken || session?.contributorId;

  // Always create local preview assets — shown in review page regardless of backend
  const localAssets = files.map((file, i) => ({
    id: `photo-${Date.now()}-${i}`,
    file_name: file.name,
    file_type: file.type,
    file_size_bytes: file.size,
    storage_path: null, // populated by Daniel's upload system later
    storage_bucket: 'memorial-assets',
    taken_at: null,
    caption: null,
    previewUrl: typeof URL !== 'undefined' ? URL.createObjectURL(file) : null,
  }));

  try {
    const formData = new FormData();
    files.forEach((file) => formData.append('files[]', file));
    if (contributorToken) formData.append('contributor_token', contributorToken);

    const response = await fetch(`${API_URL}/contribute/${token}/photos`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const backendAssets = (data.files || []).filter(f => f.id && f.file_name);
      const finalAssets = backendAssets.length > 0
        ? backendAssets.map((f, i) => ({
            id: f.id,
            file_name: f.file_name,
            storage_path: f.storage_path,
            storage_bucket: 'memorial-assets',
            taken_at: null,
            caption: null,
            previewUrl: files[i] ? URL.createObjectURL(files[i]) : null,
          }))
        : localAssets;

      const existing = readStoredPhotos(token);
      writeStoredPhotos(token, [...existing, ...finalAssets]);
      return { success: true, uploaded: finalAssets.length, assets: finalAssets };
    }
    throw new Error('Backend returned error');
  } catch {
    // Fallback — still saves local previews so review page works
    const existing = readStoredPhotos(token);
    writeStoredPhotos(token, [...existing, ...localAssets]);
    return { success: true, uploaded: files.length, assets: localAssets };
  }
}

/**
 * POST /contribute/:token/voice
 * Real fetch to backend — marks voice_done=true in contributors table.
 * Also saves local recording data so review page shows the recording immediately.
 * Real file storage handled by Daniel's upload system when merged.
 */
export async function uploadVoice(token, file, contributorTitle) {
  if (!contributorTitle || contributorTitle.trim() === '') {
    throw new Error('A title is required for each voice recording');
  }

  const session = readContributorSession(token);
  const contributorToken = session?.contributorToken || session?.contributorId;

  const localRecording = {
    id: `voice-${Date.now()}`,
    contributor_title: contributorTitle.trim(),
    file_name: file.name,
    file_type: file.type,
    file_size_bytes: file.size,
    storage_path: null, // populated by Daniel's upload system later
    storage_bucket: 'memorial-assets',
    duration_seconds: 0,
  };

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contributor_title', contributorTitle.trim());
    if (contributorToken) formData.append('contributor_token', contributorToken);

    const response = await fetch(`${API_URL}/contribute/${token}/voice`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const recording = {
        id: data.recording?.id || localRecording.id,
        contributor_title: data.recording?.contributor_title || contributorTitle.trim(),
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        storage_path: data.recording?.storage_path || null,
        storage_bucket: 'memorial-assets',
        duration_seconds: 0,
      };
      const existing = readStoredVoice(token);
      writeStoredVoice(token, [...existing, recording]);
      return { success: true, recording };
    }
    throw new Error('Backend returned error');
  } catch {
    // Fallback — still saves local recording so review page works
    const existing = readStoredVoice(token);
    writeStoredVoice(token, [...existing, localRecording]);
    return { success: true, recording: localRecording };
  }
}

/**
 * DELETE /contribute/:token/photos/:assetId
 * Removes photo from localStorage before submission.
 */
export async function deletePhoto(token, assetId) {
  const { removePhoto } = await import("@/lib/contributionStore");
  removePhoto(assetId);
  return { success: true };
}

/**
 * DELETE /contribute/:token/voice/:recordingId
 * Removes voice recording from localStorage before submission.
 */

export async function deleteVoice(token, recordingId) {
  const { removeVoice } = await import("@/lib/contributionStore");
  removeVoice(recordingId);
  return { success: true };
}

/**
 * Returns contributor draft summary for the review screen.
 * Reads from localStorage — name/relationship from Sungjun's session key,
 * responses from saveResponses mirror, photos/voice from upload functions.
 */
export async function getContributorSummary(token) {
  await delay(MOCK_DELAY);

  const session = readContributorSession(token);
  const store = getStore();

  const photos = store.photos.map((p) => ({
    id: p.id,
    file_name: p.file.name,
    previewUrl: p.previewUrl,
    caption: p.caption,
  }));

  const voice = store.voice.map((r) => ({
    id: r.id,
    contributor_title: r.title,
    file_name: r.file.name,
    previewUrl: r.previewUrl,
    duration_seconds: 0,
  }));

  const contributorId = session?.contributorId || "c1b2c3d4-0000-0000-0000-000000000001";
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
 * POST /contribute/:token/submit
 * Finalizes the contribution. Requires contributorToken from Sungjun's session.
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

// ─── REBECCA: OUTPUT TABS (viewer experience) ─────────────────────────────────

/**
 * GET /memorials/:id/output
 * Returns { story, constellation, voices, photos } for the output page.
 * Memorial header fetched separately via getMemorialById().
 * Falls back to mock data if backend call fails.
 */
export async function getMemorialOutput(memorialId) {
  try {
    const session = getStoredSession();
    const response = await fetch(`${API_URL}/memorials/${memorialId}/output`, {
      headers: { Authorization: `Bearer ${session?.token || ''}` },
    });
    if (!response.ok) throw new Error('Output not found');
    return await response.json();
  } catch {
    await delay(MOCK_DELAY);
    return {
      story: [
        { order_index: 1, photo_url: null, matched_quote: 'He always made everyone feel like the most important person in the room.', contributor_name: 'Sarah', relationship_type: 'friend', theme_label: 'Warmth' },
        { order_index: 2, photo_url: null, matched_quote: 'Dad would wake up at 5am just to make sure everyone had a packed lunch.', contributor_name: 'Michael', relationship_type: 'family', theme_label: 'Quiet Devotion' },
        { order_index: 3, photo_url: null, matched_quote: 'The way he laughed — you could hear it from three rooms away.', contributor_name: 'Tom', relationship_type: 'friend', theme_label: 'Joy' },
      ],
      constellation: {
        nodes: [
          { id: 'theme-uuid-1', label: 'The Morning Routines', category: 'daily_life', summary: 'Three contributors independently described rituals around morning.', prominence_score: 0.85, quotes: [{ text: 'He made coffee for everyone before they even woke up.', contributor_name: 'Sarah', relationship_type: 'friend' }], photo_ids: [] },
          { id: 'theme-uuid-2', label: 'Warmth at the Table', category: 'relationships', summary: 'Multiple contributors recalled the feeling of being welcomed.', prominence_score: 0.72, quotes: [{ text: 'His table always had room for one more.', contributor_name: 'Tom', relationship_type: 'friend' }], photo_ids: [] },
        ],
        edges: [{ source: 'theme-uuid-1', target: 'theme-uuid-2', relationship_type: 'family', weight: 2 }],
      },
      voices: [
        { id: 'voice-uuid-1', contributor_title: 'Voicemail from Christmas 2019', key_quote: 'I just called to say I love you all.', ai_category: 'Everyday Love', ai_tags: ['holiday', 'love'], transcript_text: "Hey it's dad, just calling to say Merry Christmas.", audio_url: null, duration_seconds: 47.3 },
      ],
      photos: [
        { album_name: 'The Kitchen Table Years', cover_photo_url: null, photos: [{ id: 'photo-uuid-1', url: null, caption: null, taken_at: '2019-12-25', contributor_name: 'Sarah' }, { id: 'photo-uuid-2', url: null, caption: 'Summer BBQ', taken_at: '2018-07-04', contributor_name: 'Michael' }] },
        { album_name: 'The Garden in Every Season', cover_photo_url: null, photos: [{ id: 'photo-uuid-3', url: null, caption: null, taken_at: '2022-06-15', contributor_name: 'Tom' }] },
      ],
    };
  }
}

/**
 * GET /share/:shareToken
 * Viewer-only access — returns { story, constellation, voices, photos }.
 * Memorial header data fetched separately via getMemorialById().
 */
export async function getShareToken(shareToken) {
  if (shareToken === 'invalid') throw new Error('This share link is invalid or has expired');

  const response = await fetch(`${API_URL}/share/${shareToken}`);

  if (!response.ok) {
    if (response.status === 404) throw new Error('This share link is invalid or has expired');
    throw new Error('Failed to load memorial');
  }

  return response.json();
}

/**
 * GET /memorials/:id
 * Used by output page + share page for memorial header data.
 * Falls back to mockMemorials if backend fails.
 */
export async function getMemorialById(memorialId) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/memorials/${memorialId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Memorial not found');
    const data = await response.json();
    return data.memorial;
  } catch {
    return mockMemorials.find((m) => m.id === memorialId) ?? mockMemorials[0];
  }
}
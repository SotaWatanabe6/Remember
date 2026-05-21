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
      id: 'c1b2c3d4-0000-0000-0000-000000000001',
      name,
      status: 'in_progress',
      created_at: now,
      updated_at: now,
    },
    contributor_token: 'mock-contributor-session-token',
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

  return { success: true, saved: savedResponses.length, responses: savedResponses };
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
  return {
    success: true,
    submitted_at: new Date().toISOString(),
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
        matched_quote: 'He always made everyone feel like the most important person in the room.',
        contributor_name: 'Sarah',
        relationship_type: 'friend',
        theme_label: 'Warmth',
      },
      {
        order_index: 2,
        photo_url: null,
        matched_quote: 'Dad would wake up at 5am just to make sure everyone had a packed lunch.',
        contributor_name: 'Michael',
        relationship_type: 'family',
        theme_label: 'Quiet Devotion',
      },
      {
        order_index: 3,
        photo_url: null,
        matched_quote: 'The way he laughed — you could hear it from three rooms away.',
        contributor_name: 'Tom',
        relationship_type: 'friend',
        theme_label: 'Joy',
      },
    ],
    constellation: {
      nodes: [
        {
          id: 'theme-uuid-1',
          label: 'The Morning Routines',
          category: 'daily_life',
          summary: 'Three contributors independently described rituals around morning — coffee, early rising, and quiet acts of care before the household woke up.',
          prominence_score: 0.85,
          quotes: [
            { text: 'He made coffee for everyone before they even woke up.', contributor_name: 'Sarah', relationship_type: 'friend' },
            { text: 'Dad was always first up. Always.', contributor_name: 'Michael', relationship_type: 'family' },
          ],
          photo_ids: ['photo-uuid-1'],
        },
        {
          id: 'theme-uuid-2',
          label: 'Warmth at the Table',
          category: 'relationships',
          summary: 'Multiple contributors recalled the feeling of being welcomed — meals that stretched for hours, no one ever turned away.',
          prominence_score: 0.72,
          quotes: [
            { text: 'His table always had room for one more.', contributor_name: 'Tom', relationship_type: 'friend' },
          ],
          photo_ids: ['photo-uuid-2', 'photo-uuid-3'],
        },
        {
          id: 'theme-uuid-3',
          label: 'Quiet Devotion',
          category: 'character',
          summary: 'The things he did without being asked — packed lunches, fixed fences, showed up early. Never announced, just done.',
          prominence_score: 0.61,
          quotes: [
            { text: 'He never asked for thanks. He just did it.', contributor_name: 'Michael', relationship_type: 'family' },
          ],
          photo_ids: [],
        },
      ],
      edges: [
        { source: 'theme-uuid-1', target: 'theme-uuid-2', relationship_type: 'family', weight: 2 },
        { source: 'theme-uuid-2', target: 'theme-uuid-3', relationship_type: 'friend', weight: 1 },
      ],
    },
    voices: [
      {
        id: 'voice-uuid-1',
        contributor_title: 'Voicemail from Christmas 2019',
        key_quote: 'I just called to say I love you all. Merry Christmas.',
        ai_category: 'Everyday Love',
        ai_tags: ['holiday', 'love', 'family'],
        transcript_text: "Hey it's dad, just calling to say Merry Christmas. Hope you're all having a good one. I just called to say I love you all. Merry Christmas. See you for dinner.",
        audio_url: null,
        duration_seconds: 47.3,
      },
      {
        id: 'voice-uuid-2',
        contributor_title: 'Voice note about the garden — June 2022',
        key_quote: "The tomatoes are finally coming in. I've been waiting all summer for these.",
        ai_category: 'Everyday Joy',
        ai_tags: ['garden', 'summer', 'patience'],
        transcript_text: "Just wanted to record this. The tomatoes are finally coming in. I've been waiting all summer for these. Beautiful. Your grandmother would have loved them.",
        audio_url: null,
        duration_seconds: 28.1,
      },
    ],
    photos: [
      {
        album_name: 'The Kitchen Table Years',
        cover_photo_url: null,
        photos: [
          { id: 'photo-uuid-1', url: null, caption: null, taken_at: '2019-12-25', contributor_name: 'Sarah' },
          { id: 'photo-uuid-2', url: null, caption: 'Summer BBQ', taken_at: '2018-07-04', contributor_name: 'Michael' },
        ],
      },
      {
        album_name: 'The Garden in Every Season',
        cover_photo_url: null,
        photos: [
          { id: 'photo-uuid-3', url: null, caption: null, taken_at: '2022-06-15', contributor_name: 'Tom' },
          { id: 'photo-uuid-4', url: null, caption: null, taken_at: '2021-09-03', contributor_name: 'Sarah' },
        ],
      },
      {
        album_name: 'Faces at the Door',
        cover_photo_url: null,
        photos: [
          { id: 'photo-uuid-5', url: null, caption: null, taken_at: null, contributor_name: 'Michael' },
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
  if (shareToken === 'invalid') throw new Error('This share link is invalid or has expired');
  return getMemorialOutput('mock-memorial-id');
}
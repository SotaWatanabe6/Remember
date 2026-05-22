// src/lib/api.js
// ─────────────────────────────────────────────────────────────────────────────
// MOCK API LAYER — Phase 1
// Every API call in the app goes through this file.
// On Day 9, swap mock return values for real fetch() calls — nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const MOCK_DELAY = 500;
const now = () => new Date().toISOString();
const fakeToken = () => 'mock_jwt_' + Math.random().toString(36).slice(2);
const makeId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2)}`;
const isBrowser = () => typeof window !== 'undefined';

const AUTH_STORAGE_KEY = 'remember.mock.auth';
const MEMORIALS_STORAGE_KEY = 'remember.mock.memorials';
const USERS_STORAGE_KEY = 'remember.mock.users';

// ─── SEED DATA ───────────────────────────────────────────────────────────────
// Fixed, realistic-looking data. IDs and timestamps are live.

const MOCK_USER = {
  id: 'user-uuid-0000-0000-000000000001',
  email: 'organizer@example.com',
};

const MOCK_MEMORIALS = [
  {
    id: 'memorial_001',
    user_id: MOCK_USER.id,
    subject_name: 'John Smith',
    date_of_birth: '1943-03-15',
    date_of_passing: '2024-01-10',
    cover_photo_url: null,
    status: 'collecting',
    created_at: '2026-05-18T16:00:00.000Z',
    updated_at: '2026-05-18T16:00:00.000Z',
  },
  {
    id: 'memorial_002',
    user_id: MOCK_USER.id,
    subject_name: 'Margaret Collins',
    date_of_birth: '1938-04-12',
    date_of_passing: '2024-01-05',
    cover_photo_url: null,
    status: 'generating',
    created_at: '2026-05-14T17:30:00.000Z',
    updated_at: '2026-05-19T10:15:00.000Z',
  },
  {
    id: 'memorial_003',
    user_id: MOCK_USER.id,
    subject_name: 'Eleanor Hart',
    date_of_birth: '1942-11-07',
    date_of_passing: '2026-03-28',
    cover_photo_url: null,
    status: 'complete',
    created_at: '2026-05-10T12:00:00.000Z',
    updated_at: '2026-05-17T15:45:00.000Z',
  },
];

const MOCK_USERS = [
  {
    ...MOCK_USER,
    full_name: 'Maya Hart',
    password: null,
  },
];

const readStoredValue = (key, fallbackValue) => {
  if (!isBrowser()) {
    return fallbackValue;
  }

  const storedValue = window.localStorage.getItem(key);

  if (!storedValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    window.localStorage.removeItem(key);
    return fallbackValue;
  }
};

const writeStoredValue = (key, value) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const clearStoredValue = (key) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(key);
};

const ensureMockState = () => {
  if (!isBrowser()) {
    return;
  }

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

const MOCK_CONTRIBUTORS = [
  {
    id: 'contributor-uuid-000000000001',
    name: 'Sarah',
    relationship_type: 'friend',
    status: 'submitted',
    submitted_at: now(),
  },
  {
    id: 'contributor-uuid-000000000002',
    name: 'Michael',
    relationship_type: 'family',
    status: 'submitted',
    submitted_at: now(),
  },
  {
    id: 'contributor-uuid-000000000003',
    name: 'Tom Harris',
    relationship_type: 'colleague',
    status: 'in_progress',
    submitted_at: null,
  },
];

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

// ─── AUTH ────────────────────────────────────────────────────────────────────

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
    throw new Error('An account with this email already exists.');
  }

  const user = {
    id: makeId('user-uuid'),
    email: trimmedEmail,
    full_name: full_name ?? '',
  };
  const token = fakeToken();

  writeStoredValue(USERS_STORAGE_KEY, [...users, { ...user, password }]);
  setStoredSession({ user, token });

  return {
    user,
    token,
  };
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
    throw new Error('Invalid email or password.');
  }

  const user = matchingUser
    ? {
        id: matchingUser.id,
        email: matchingUser.email,
        full_name: matchingUser.full_name ?? '',
      }
    : {
        ...MOCK_USER,
        email: trimmedEmail || MOCK_USER.email,
      };
  const token = fakeToken();

  setStoredSession({ user, token });

  return {
    user,
    token,
  };
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

// ─── MEMORIALS ───────────────────────────────────────────────────────────────

/**
 * POST /memorials
 * Creates a new memorial. Protected.
 * Body: { subject_name, date_of_birth, date_of_passing, cover_photo_url }
 */
export async function createMemorial({ subject_name, date_of_birth, date_of_passing, cover_photo_url }) {
  await delay(MOCK_DELAY);
  const currentUser = getActiveUser();
  const createdAt = now();
  const memorial = {
    id: makeId('memorial'),
    user_id: currentUser.id,
    subject_name: subject_name.trim(),
    date_of_birth: date_of_birth ?? null,
    date_of_passing: date_of_passing ?? null,
    cover_photo_url: cover_photo_url ?? null,
    status: 'collecting',
    created_at: createdAt,
    updated_at: createdAt,
  };

  writeStoredValue(MEMORIALS_STORAGE_KEY, [memorial, ...getStoredMemorials()]);

  return {
    memorial,
  };
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

// ─── INVITE LINK ─────────────────────────────────────────────────────────────

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
      id: 'invite-uuid-' + Math.random().toString(36).slice(2),
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

// ─── CONTRIBUTORS ────────────────────────────────────────────────────────────

/**
 * GET /memorials/:id/contributors
 * Returns all contributors for a memorial. Protected.
 */
export async function getContributors(memorialId) {
  await delay(MOCK_DELAY);
  return { contributors: MOCK_CONTRIBUTORS };
}

// ─── SHARE ───────────────────────────────────────────────────────────────────

/**
 * POST /memorials/:id/share
 * Generates a viewer share link. Protected.
 */
export async function createShareLink(memorialId) {
  await delay(MOCK_DELAY);
  const token = 'mock_share_' + Math.random().toString(36).slice(2);
  return {
    share_link: {
      token,
      url: `http://localhost:3000/share/${token}`,
    },
  };
}

// ─── AI ──────────────────────────────────────────────────────────────────────

/**
 * POST /ai/memorials/:id/generate
 * Triggers AI generation for a memorial. Protected.
 */
export async function triggerGeneration(memorialId) {
  await delay(MOCK_DELAY);
  return {
    job: {
      id: 'job-uuid-' + Math.random().toString(36).slice(2),
      status: 'queued',
      progress: 0,
      current_step: 'Starting...',
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

// ─── CONTRIBUTE FLOW ─────────────────────────────────────────────────────────

/**
 * GET /contribute/:token
 * Validates invite token, returns memorial details for landing page.
 */
export async function getInviteToken(token) {
  await delay(MOCK_DELAY);
  if (token === 'invalid') throw new Error('Invalid or expired invite link');
  return {
    memorial: {
      id: 'memorial_001',
      subject_name: 'John Smith',
      cover_photo_url: null,
      date_of_birth: '1943-03-15',
      date_of_passing: '2024-01-10',
      status: 'active',
    },
    link: {
      id: 'a1b2c3d4-0000-0000-0000-000000000002',
      is_active: true,
      use_count: 3,
      max_uses: null,
      expires_at: null,
    },
  };
}

/**
 * POST /contribute/:token/start
 * Creates contributor row, returns contributor session token.
 * Body: { name: string }
 */
export async function startContribution(token, name) {
  await delay(MOCK_DELAY);
  return {
    contributor: {
      id: 'c1b2c3d4-0000-0000-0000-000000000001',
      name,
      status: 'in_progress',
    },
    contributor_token: 'mock-contributor-session-token',
  };
}

/**
 * POST /contribute/:token/relationship
 * Saves relationship type to contributors table.
 * Body: { relationship_type: 'family'|'friend'|'colleague'|'partner'|'sibling'|'parent'|'community'|'other', relationship_label?: string }
 */
export async function saveRelationship(token, relationshipType, relationshipLabel = null) {
  await delay(MOCK_DELAY);
  return { success: true };
}

/**
 * POST /contribute/:token/responses
 * Saves questionnaire Q&A. Supports partial saves (autosave).
 * Body: { responses: [{ question_text: string, response_text: string, order_index: number }] }
 */
export async function saveResponses(token, responses) {
  await delay(MOCK_DELAY);
  return { success: true, saved: responses.length };
}

/**
 * POST /contribute/:token/photos
 * Uploads photos to Supabase Storage, writes media_assets rows.
 * Body: FormData — files[] (images only: jpg, png, heic, webp)
 *
 * Response shape Rebecca's UI depends on:
 * - assets[].id          → used for edit/delete in review screen
 * - assets[].file_name   → shown in thumbnail label
 * - assets[].storage_path → used to build preview URL
 * - assets[].taken_at    → shown as year in All Photos tab
 */
export async function uploadPhotos(token, files) {
  await delay(MOCK_DELAY * 2); // uploads take longer
  return {
    success: true,
    uploaded: files.length,
    assets: files.map((file, i) => ({
      id: `photo-uuid-${i + 1}`,
      file_name: file.name,
      file_type: file.type,
      file_size_bytes: file.size,
      storage_path: `memorials/a1b2c3d4/contributions/c1b2c3d4/photos/${file.name}`,
      storage_bucket: 'memorial-assets',
      taken_at: null,
      caption: null,
    })),
  };
}

/**
 * POST /contribute/:token/voice
 * Uploads voice recording to Supabase Storage, writes voice_recordings row.
 * Body: FormData — file (audio: mp3, m4a, wav, ogg), contributor_title (required)
 *
 * Response shape Rebecca's UI depends on:
 * - recording.id               → used for edit/delete in review screen
 * - recording.contributor_title → displayed on Voices tab card
 * - recording.file_name        → shown in review
 * - recording.duration_seconds → shown in audio player
 */
export async function uploadVoice(token, file, contributorTitle) {
  await delay(MOCK_DELAY * 2);
  if (!contributorTitle || contributorTitle.trim() === '') {
    throw new Error('A title is required for each voice recording');
  }
  return {
    success: true,
    recording: {
      id: 'voice-uuid-1',
      contributor_title: contributorTitle,
      file_name: file.name,
      file_type: file.type,
      file_size_bytes: file.size,
      storage_path: `memorials/a1b2c3d4/contributions/c1b2c3d4/voice/${file.name}`,
      storage_bucket: 'memorial-assets',
      duration_seconds: 47.3,
    },
  };
}

/**
 * DELETE /contribute/:token/photos/:assetId
 * Removes a photo before submission.
 */
export async function deletePhoto(token, assetId) {
  await delay(MOCK_DELAY);
  return { success: true };
}

/**
 * DELETE /contribute/:token/voice/:recordingId
 * Removes a voice recording before submission.
 */
export async function deleteVoice(token, recordingId) {
  await delay(MOCK_DELAY);
  return { success: true };
}

/**
 * GET /contribute/:token/summary
 * Returns everything the contributor has submitted so far — used on review screen.
 *
 * Response based on review screen depends on:
 * - photos[]     → thumbnail grid
 * - voice[]      → audio list with titles
 * - responses[]  → questionnaire answers for review
 * - contributor  → name + relationship shown at top
 */
export async function getContributorSummary(token) {
  await delay(MOCK_DELAY);
  return {
    contributor: {
      id: 'c1b2c3d4-0000-0000-0000-000000000001',
      name: 'Sarah',
      relationship_type: 'friend',
      relationship_label: null,
    },
    responses: [
      { question_text: 'What is a memory that captures who they were?', response_text: 'He always made everyone feel welcome at his table.' },
      { question_text: 'What would they say if they walked in right now?', response_text: 'Who wants coffee? I just made a fresh pot.' },
    ],
    photos: [
      { id: 'photo-uuid-1', file_name: 'christmas_2019.jpg', storage_path: 'memorials/.../photos/christmas_2019.jpg', taken_at: '2019-12-25' },
      { id: 'photo-uuid-2', file_name: 'birthday_2021.jpg', storage_path: 'memorials/.../photos/birthday_2021.jpg', taken_at: '2021-06-10' },
      { id: 'photo-uuid-3', file_name: 'garden_summer.jpg', storage_path: 'memorials/.../photos/garden_summer.jpg', taken_at: null },
    ],
    voice: [
      { id: 'voice-uuid-1', contributor_title: 'Voicemail from Christmas 2019', file_name: 'voicemail.m4a', duration_seconds: 47.3 },
    ],
  };
}

/**
 * POST /contribute/:token/submit
 * Finalises submission — sets contributor status = submitted.
 */
export async function submitContribution(token) {
  await delay(MOCK_DELAY);
  return {
    success: true,
    submitted_at: now(),
  };
}

// ─── OUTPUT TABS (viewer experience) ─────────────────────────────────────────

/**
 * GET /memorials/:id/output
 * Returns complete four-tab JSON for the memorial output page.
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
 */
export async function getShareToken(shareToken) {
  await delay(MOCK_DELAY);
  if (shareToken === 'invalid') throw new Error('This share link is invalid or has expired');
  return getMemorialOutput('mock-memorial-id');
}

// src/lib/api.js
// ─────────────────────────────────────────────────────────────────────────────
// MOCK API LAYER — Phase 1
// Every API call in the app goes through this file.
// On Day 9, swap mock return values for real fetch() calls — nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

import { mockMemorials } from "@/data/mockMemorials.js";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const MOCK_DELAY = 500;

// ─── CONTRIBUTE FLOW ────────

/**
 * GET /contribute/:token
 * Validates invite token, returns memorial details for landing page.
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
      taken_at: null,        // populated from EXIF metadata on backend
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
      duration_seconds: 47.3,   // populated by backend after upload
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
    submitted_at: new Date().toISOString(),
  };
}

// ─── OUTPUT TABS (viewer experience) ────────

/**
 * GET /memorials/:id/output
 * Returns complete four-tab JSON for the memorial output page.
 * Rebecca owns: All Photos tab + output page shell
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
  // Returns same shape as getMemorialOutput — viewer just can't edit anything
  return getMemorialOutput('mock-memorial-id');
}

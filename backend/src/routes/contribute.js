require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const multer = require('multer');
const { validateFiles } = require('../middleware/validate');
const { extractImageMetadata } = require('../services/exif');
const { extractAudioDuration } = require('../services/duration');

const STORAGE_BUCKET = 'memorial-assets';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

// GET /contribute/:token — validate invite token
router.get('/:token', async (req, res) => {
  try {
    const { data: invite, error } = await supabase
      .from('invite_links')
      .select('*')
      .eq('token', req.params.token)
      .single()

    if (error || !invite) {
      return res.status(404).json({ error: 'Invite link not found' })
    }

    if (!invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This link has expired.' })
    }

    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return res.status(410).json({ error: 'This link has reached its maximum uses.' })
    }

    const { data: memorial } = await supabase
      .from('memorials')
      .select('id, subject_name, cover_photo_url')
      .eq('id', invite.memorial_id)
      .single()

    res.json({
      memorial,
      invite: {
        token: invite.token,
        is_active: invite.is_active,
        use_count: invite.use_count
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/start — create contributor session
router.post('/:token/start', async (req, res) => {
  try {
    const { name, email } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const { data: invite, error } = await supabase
      .from('invite_links')
      .select('*')
      .eq('token', req.params.token)
      .single()

    if (error || !invite || !invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    const { data: contributor, error: contribError } = await supabase
      .from('contributors')
      .insert({
        memorial_id: invite.memorial_id,
        invite_link_id: invite.id,
        name,
        email: email || null,
        status: 'in_progress'
      })
      .select()
      .single()

    if (contribError) return res.status(400).json({ error: contribError.message })

    // increment use_count
    await supabase
      .from('invite_links')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)

    res.status(201).json({
      contributor: {
        id: contributor.id,
        memorial_id: contributor.memorial_id,
        name: contributor.name,
        status: contributor.status
      },
      contributor_token: contributor.id
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/relationship — save relationship type
router.post('/:token/relationship', async (req, res) => {
  try {
    const { contributor_token, relationship_type, relationship_label } = req.body
    if (!contributor_token || !relationship_type) {
      return res.status(400).json({ error: 'contributor_token and relationship_type are required' })
    }

    const { data, error } = await supabase
      .from('contributors')
      .update({ relationship_type, relationship_label: relationship_label || null })
      .eq('id', contributor_token)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ contributor: { id: data.id, relationship_type: data.relationship_type } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/responses — save questionnaire responses
router.post('/:token/responses', async (req, res) => {
  try {
    const { contributor_token, responses } = req.body
    if (!contributor_token || !responses || !responses.length) {
      return res.status(400).json({ error: 'contributor_token and responses are required' })
    }

    const { data: contributor } = await supabase
      .from('contributors')
      .select('memorial_id')
      .eq('id', contributor_token)
      .single()

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' })

    const rows = responses.map(r => ({
      memorial_id: contributor.memorial_id,
      contributor_id: contributor_token,
      question_text: r.question_text,
      response_text: r.response_text,
      order_index: r.order_index
    }))

    const { error } = await supabase
      .from('questionnaire_responses')
      .insert(rows)
    if (error) return res.status(400).json({ error: error.message })

    await supabase
      .from('contributors')
      .update({ questionnaire_done: true })
      .eq('id', contributor_token)

    res.json({ saved: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/submit — finalize contribution
router.post('/:token/submit', async (req, res) => {
  try {
    const { contributor_token } = req.body
    if (!contributor_token) {
      return res.status(400).json({ error: 'contributor_token is required' })
    }

    const { data, error } = await supabase
      .from('contributors')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', contributor_token)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ contributor: { id: data.id, status: data.status, submitted_at: data.submitted_at } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// POST /contribute/:token/photos
router.post('/:token/photos', upload.array('files', 10), validateFiles, async (req, res) => {
  try {
    const { contributor_token, caption } = req.body;
    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' });

    const { data: contributor } = await supabase
      .from('contributors')
      .select('memorial_id')
      .eq('id', contributor_token)
      .single();

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' });

    const results = [];

    for (const file of req.files) {
      const exif = await extractImageMetadata(file.buffer);

      const { data: dbRecord, error } = await supabase
        .from('media_assets')
        .insert({
          memorial_id: contributor.memorial_id,
          contributor_id: contributor_token,
          storage_path: 'pending',
          storage_bucket: STORAGE_BUCKET,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size_bytes: file.size,
          ai_analysis_status: 'pending',
          caption: caption || null,
          width: exif?.width || null,
          height: exif?.height || null,
          taken_at: exif?.takenAt || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const ext = file.originalname.split('.').pop().toLowerCase();
      const storagePath = `memorials/${contributor.memorial_id}/contributions/${contributor_token}/photos/${dbRecord.id}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (storageError) {
        await supabase.from('media_assets').delete().eq('id', dbRecord.id);
        continue;
      }

      await supabase.from('media_assets').update({ storage_path: storagePath }).eq('id', dbRecord.id);

      results.push({
        id: dbRecord.id,
        storage_path: storagePath,
        file_name: file.originalname,
      });
    }

    res.status(201).json({ uploaded: results.length, files: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /contribute/:token/voice
router.post('/:token/voice', upload.single('file'), async (req, res) => {
  try {
    const { contributor_token, contributor_title } = req.body;
    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' });
    if (!contributor_title?.trim()) return res.status(400).json({ error: 'contributor_title is required' });

    const { data: contributor } = await supabase
      .from('contributors')
      .select('memorial_id')
      .eq('id', contributor_token)
      .single();

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' });

    const file = req.file;
    const durationSeconds = await extractAudioDuration(file.buffer, file.mimetype);

    const { data: dbRecord, error } = await supabase
      .from('voice_recordings')
      .insert({
        memorial_id: contributor.memorial_id,
        contributor_id: contributor_token,
        storage_path: 'pending',
        storage_bucket: STORAGE_BUCKET,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size_bytes: file.size,
        contributor_title: contributor_title.trim(),
        transcription_status: 'pending',
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const ext = file.originalname.split('.').pop().toLowerCase();
    const storagePath = `memorials/${contributor.memorial_id}/contributions/${contributor_token}/voice/${dbRecord.id}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (storageError) {
      await supabase.from('voice_recordings').delete().eq('id', dbRecord.id);
      return res.status(500).json({ error: 'Storage upload failed' });
    }

    await supabase.from('voice_recordings').update({ storage_path: storagePath }).eq('id', dbRecord.id);

    res.status(201).json({
      recording: {
        id: dbRecord.id,
        contributor_title: contributor_title.trim(),
        storage_path: storagePath,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router
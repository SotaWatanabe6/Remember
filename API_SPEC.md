# Remember MVP — API Specification

Base URL: `http://localhost:3001`

All protected routes require:
`Authorization: Bearer <token>`

---

## AUTH

### POST /auth/register
Create a new organizer account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "token": "jwt_token_here"
}
```

---

### POST /auth/login
Login to existing account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "token": "jwt_token_here"
}
```

---

## MEMORIALS

### POST /memorials
Create a new memorial. Protected.

**Request body:**
```json
{
  "subject_name": "Margaret Collins",
  "date_of_birth": "1938-04-12",
  "date_of_passing": "2024-01-05",
  "cover_photo_url": "memorial-assets/uuid/cover/photo.jpg"
}
```

**Response 201:**
```json
{
  "memorial": {
    "id": "uuid",
    "user_id": "uuid",
    "subject_name": "Margaret Collins",
    "date_of_birth": "1938-04-12",
    "date_of_passing": "2024-01-05",
    "cover_photo_url": "url",
    "status": "collecting",
    "created_at": "timestamp"
  }
}
```

---

### GET /memorials
Get all memorials for the logged in organizer. Protected.

**Response 200:**
```json
{
  "memorials": [
    {
      "id": "uuid",
      "subject_name": "Margaret Collins",
      "status": "collecting",
      "created_at": "timestamp"
    }
  ]
}
```

---

### GET /memorials/:id
Get a single memorial by ID. Protected.

**Response 200:**
```json
{
  "memorial": {
    "id": "uuid",
    "subject_name": "Margaret Collins",
    "status": "collecting",
    "cover_photo_url": "url",
    "date_of_birth": "1938-04-12",
    "date_of_passing": "2024-01-05",
    "created_at": "timestamp"
  }
}
```

---

### POST /memorials/:id/invite-link
Generate an invite link for contributors. Protected.

**Request body:**
```json
{
  "expires_at": "2026-06-01",
  "max_uses": 50
}
```

**Response 201:**
```json
{
  "invite_link": {
    "id": "uuid",
    "token": "abc123xyz",
    "url": "http://localhost:3000/contribute/abc123xyz",
    "is_active": true,
    "expires_at": "2026-06-01",
    "max_uses": 50,
    "use_count": 0,
    "created_at": "timestamp"
  }
}
```

---

### PATCH /memorials/:id/invite-link
Deactivate or reactivate the invite link. Protected.

**Request body:**
```json
{
  "is_active": false
}
```

**Response 200:**
```json
{
  "invite_link": {
    "id": "uuid",
    "is_active": false
  }
}
```

---

### GET /memorials/:id/contributors
Get all contributors for a memorial. Protected.

**Response 200:**
```json
{
  "contributors": [
    {
      "id": "uuid",
      "name": "John Smith",
      "relationship_type": "friend",
      "status": "submitted",
      "submitted_at": "timestamp"
    }
  ]
}
```

---

### GET /memorials/:id/output
Get the full AI-generated output for all four tabs. Protected.

**Response 200:**
```json
{
  "story": [
    {
      "order_index": 1,
      "photo_url": "url",
      "quote": "She always made everyone feel welcome.",
      "contributor_name": "John Smith",
      "relationship_type": "friend",
      "theme_label": "her warmth"
    }
  ],
  "constellation": {
    "nodes": [
      {
        "id": "uuid",
        "label": "her humor",
        "summary": "Margaret had a laugh that filled every room.",
        "prominence_score": 0.9,
        "quotes": [
          {
            "text": "She could make anyone laugh.",
            "contributor_name": "John Smith",
            "relationship_type": "friend"
          }
        ],
        "photo_urls": ["url1", "url2"]
      }
    ],
    "edges": [
      {
        "source": "uuid",
        "target": "uuid",
        "relationship_type": "friend",
        "weight": 0.7
      }
    ]
  },
  "voices": [
    {
      "id": "uuid",
      "contributor_title": "Her voicemail from Christmas 2022",
      "key_quote": "I just wanted to say I love you all so much.",
      "transcript_text": "Full transcript here...",
      "ai_category": "expressions of love",
      "audio_url": "url"
    }
  ],
  "photos": {
    "albums": [
      {
        "name": "The kitchen table years",
        "cover_photo_url": "url",
        "photo_count": 12,
        "photos": [
          {
            "id": "uuid",
            "url": "url",
            "caption": "Sunday dinner 2019",
            "year": "2019",
            "contributor_name": "John Smith"
          }
        ]
      }
    ]
  }
}
```

---

### POST /memorials/:id/share
Generate a viewer share link. Protected.

**Response 201:**
```json
{
  "share_link": {
    "token": "xyz789abc",
    "url": "http://localhost:3000/share/xyz789abc"
  }
}
```

---

## CONTRIBUTE

### GET /contribute/:token
Validate invite token and get memorial info. Public.

**Response 200:**
```json
{
  "memorial": {
    "id": "uuid",
    "subject_name": "Margaret Collins",
    "cover_photo_url": "url"
  },
  "invite": {
    "token": "abc123xyz",
    "is_active": true,
    "use_count": 14
  }
}
```

**Response 410:**
```json
{
  "error": "This link is no longer active."
}
```

---

### POST /contribute/:token/start
Create a contributor session. Public.

**Request body:**
```json
{
  "name": "John Smith",
  "email": "john@example.com"
}
```

**Response 201:**
```json
{
  "contributor": {
    "id": "uuid",
    "memorial_id": "uuid",
    "name": "John Smith",
    "status": "in_progress"
  },
  "contributor_token": "uuid"
}
```

---

### POST /contribute/:token/relationship
Save relationship type. Public.

**Request body:**
```json
{
  "contributor_token": "uuid",
  "relationship_type": "friend",
  "relationship_label": null
}
```

**Response 200:**
```json
{
  "contributor": {
    "id": "uuid",
    "relationship_type": "friend"
  }
}
```

---

### POST /contribute/:token/responses
Save questionnaire responses. Supports partial save. Public.

**Request body:**
```json
{
  "contributor_token": "uuid",
  "responses": [
    {
      "question_text": "What were they like as a person?",
      "response_text": "She was warm, funny, and always present.",
      "order_index": 1
    }
  ]
}
```

**Response 200:**
```json
{
  "saved": true
}
```

---

### POST /contribute/:token/photos
Upload photos. Public.

**Request:** multipart/form-data
- `contributor_token` — string
- `files[]` — image files (jpg, png, heic)

**Response 201:**
```json
{
  "uploaded": 5,
  "files": [
    {
      "id": "uuid",
      "storage_path": "memorials/uuid/contributions/uuid/photos/uuid.jpg",
      "file_name": "photo.jpg"
    }
  ]
}
```

---

### POST /contribute/:token/voice
Upload voice recordings. Public.

**Request:** multipart/form-data
- `contributor_token` — string
- `file` — audio file (mp3, m4a, wav)
- `contributor_title` — string (required)

**Response 201:**
```json
{
  "recording": {
    "id": "uuid",
    "contributor_title": "Her voicemail from Christmas 2022",
    "storage_path": "memorials/uuid/contributions/uuid/voice/uuid.m4a"
  }
}
```

---

### POST /contribute/:token/submit
Finalize contribution. Public.

**Request body:**
```json
{
  "contributor_token": "uuid"
}
```

**Response 200:**
```json
{
  "contributor": {
    "id": "uuid",
    "status": "submitted",
    "submitted_at": "timestamp"
  }
}
```

---

## AI

### POST /ai/memorials/:id/generate
Trigger AI generation for a memorial. Protected.

**Response 201:**
```json
{
  "job": {
    "id": "uuid",
    "status": "queued",
    "progress": 0,
    "current_step": "Starting..."
  }
}
```

---

### GET /ai/jobs/:id/status
Poll job status. Protected.

**Response 200:**
```json
{
  "job": {
    "id": "uuid",
    "status": "processing",
    "progress": 45,
    "current_step": "Finding the moments that show their humor...",
    "error_message": null
  }
}
```

---

## SHARE

### GET /share/:token
Get memorial output via viewer share link. Public.

**Response 200:**
Same shape as GET /memorials/:id/output but read-only.

**Response 404:**
```json
{
  "error": "Memorial not found."
}
```

---

## ERROR RESPONSES

All errors follow this shape:
```json
{
  "error": "Description of what went wrong"
}
```

Status codes:
- 400 — bad request, missing fields
- 401 — not authenticated
- 403 — not authorized
- 404 — not found
- 410 — invite link expired or deactivated
- 500 — server error
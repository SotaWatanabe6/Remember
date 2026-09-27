# Story bookends (US-11, US-12, US-13)

New generation produces `opening`, the existing chapter/photo slides, `farewell`,
then `credits` in `output.story`. `order_index` is consecutive and one-based.
The viewer preserves that order and all slides selected by the pipeline.

| Type | Fields | Behavior |
| --- | --- | --- |
| `opening` | `subject_name`, `photo_url`, `date_of_birth`, `date_of_passing` | Organizer cover, name and available dates only. No generated quote or narration. Missing cover/dates are omitted. |
| `farewell` | `date_of_passing`, `farewell_message`, optional `contributor_id`, `contributor_name`, `relationship_type` | Plain slide immediately before credits. Uses an existing closing sentence, or “In loving memory” without attribution. |
| `credits` | `contributors[]`: `contributor_id`, `contributor_name`, `relationship_type`, nullable `quote` | Every pipeline contributor appears once by ID, including contributors with no usable quote. The complete list scrolls within one final slide. |

Opening construction never requires AI. The organizer generation confirmation
discloses the farewell fallback phrase. Farewell selection and missing credits
selection share one model call, returning only indexes into whole questionnaire
sentences (4–45 words, up to 320 characters). Text and attribution are read from
those source sentences, never generated from the model's output. Flagged answers
and unknown contributors cannot supply candidates.

Credits first reuse a `matched_quote` whose questionnaire ownership can be
resolved unambiguously; the photo uploader is not assumed to own the quote.
Then they reuse an unflagged Voices `key_quote` by contributor ID, even if the
recording lacks an intro line. Only contributors still missing a quote are
eligible for a new selection: the most concrete sentence that stands alone.
Invalid selections, failures, or no suitable source leave their quote empty.
Existing quotes cannot be overwritten by the selection pass. Anonymous names
are masked and contributors sharing a display name are kept distinct.

Existing saved outputs remain readable. Regenerate a memorial to produce the
new bookends; no database migration or automatic regeneration is performed.

## Verification

- `node --test backend/test/*.test.cjs frontend/tests/*.test.cjs frontend/tests/*.test.mjs`
- Focused frontend ESLint on `StorySlideshow.jsx`, `storySlides.mjs`, and the
  organizer manage page.
- `npm run build` in `frontend` (default Turbopack production build).
- Local browser fixture: opening with available dates, keyboard/button navigation,
  attributed farewell, and a 16-person credits list scrolled to the final entry;
  checked framed and unframed layouts, including a 375px mobile viewport.

Automated AI tests use fixture responses; they verify source/index enforcement,
quote reuse, ordering, anonymous identities and failure behavior without sending
real contributor data to an AI provider.

# US-20: memory photo matching

Newly generated Relationship outputs use questionnaire memory nodes (`constellation.version: 2`). The previous generator built nodes from photo groups and required every node to have photos, so it could not support US-20. The replacement selects concrete, exact excerpts from known contributors' unflagged answers and validates their source attribution. Photo-only inputs never invent a memory. Cross-contributor memory merging (US-23) and polished contributor summaries (US-36) are separate work.

Each memory is compared against the full eligible bulk upload pool, regardless of who uploaded a photo. Reads paginate by creation time and ID, replacing the former 60-photo cutoff. Photos without storage paths or analysis, flagged photos, photos explicitly excluding the subject, and photos with zero people are excluded from matching. Album and Story composition still use their existing logic; Story retains its 20-slide photo selection limit.

The AI assesses batches of 20 photos per memory against Natasha's Sprint 5 criteria:

- Era/timeframe and visible ages must fit.
- Both setting and activity must fit; a hiking photo is not a gardening match merely because both are outdoors.
- Visible people must plausibly fit the scene. Identity is not inferred from an uploader or facial appearance; a plausible pair is preferred, with the subject alone allowed when supported.

Every factor must report `match`, concrete evidence, and numeric confidence at least 0.8. This is a conservative implementation threshold, not a calibrated probability. The strongest weakest-factor score wins across batches; ties keep the first candidate in stable photo order. Unknown or contradictory factors never qualify. Invalid photo IDs, malformed responses, or API failures leave that memory without a photo rather than selecting from an incompletely assessed pool. There is no keyword, cover-photo, or contributor-upload fallback.

Nodes retain zero or one `photo_ids` / `photo_urls` entries and the accepted `photo_match` evidence. URLs resolve using the selected photo's storage bucket. Unmatched nodes and edges stay visible, and their detail panel displays the memory and contributor without an image region. Older saved theme outputs retain their existing UI. Existing memorials need regeneration to receive this behavior; no database migration is required.

## Verification

Run `npm test` in `backend`, `node --test tests/*.test.*` in `frontend`, and the frontend production build. Fixtures cover grounded extraction, anonymity, independent factor vetoes, missing evidence, invalid scores/IDs, failures, no-photo memories, cross-uploader selection, the best match beyond photo 60, paginated reads, storage buckets, and legacy UI normalization.

For a live acceptance check, regenerate a test memorial with a childhood gardening memory and a pool containing a matching garden scene, a hiking scene from the same era, and a late-life garden portrait. Only a sufficiently supported scene should appear. Remove the matching scene and regenerate: the memory must remain, without a photo. Check the organizer view, viewer, and shared view.

Automated tests stub model responses and storage; they verify guards and data flow, not real-world model accuracy. Validate the semantic choices against representative memorial photos before release. Larger pools now require more vision and matching calls and remain subject to the configured pipeline timeout.

Implementation validation: 133 backend tests and 39 frontend tests passed, including a generation-route test saving a match from photo 61. The normal Next.js production build passed. A local browser fixture verified matched and unmatched detail panels, keyboard selection, complete node labels, and clearing the image when switching to an unmatched memory. The temporary fixture was removed afterward.

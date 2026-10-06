# Moderation review and shared memories

Generation checks questionnaire answers, entire contributions and the complete photo pool before producing Story, Albums, Relationship or Voices. Newly flagged content is saved immediately and updates the current generation state. An unresolved concern pauses the job as `awaiting_review`, returns the memorial to collection and produces no output. Failed moderation writes stop generation. Photo provider/unreadable-image failures hold the photo; storage URL, answer or contribution provider failures fail the job for retry. Malformed model decisions cannot silently approve content.

In **Approve Contributions**, flagged submissions show the reason and original content, including uploads. Organizers can approve as-is, edit an answer, move it by changing its question, or leave content out. Decisions record a moderation timestamp and persist across regeneration. Approval overrides prevent the same item from being flagged again. Exclusions retain original records and files, skip bulk approval/deletion and stay out of the archive and generated outputs. Excluding a contributor also excludes their answers, photos, voice recordings and credit quotes. Unresolved concerns block bulk approval.

Photo moderation includes violent, explicit, disturbing, private/sensitive, clearly unrelated and unreadable uploads. Personal scenes are valid; lack of a visible person alone is not evidence of a wrong upload. High-harm categories use a lower confidence threshold. Severe blur is recorded separately and excludes a photo from Story, while mild identifiable blur remains eligible. Blur alone does not remove a photo from Albums.

The saved version-2 constellation now merges memories when at least two of who/action/setting clearly match, with any contradiction vetoing the merge. Every pair within a merged group must qualify. Topic keywords alone cannot merge nodes. Each attribution preserves its exact excerpt and source answer. Summaries use only that contributor's own answers; node size grows with distinct contributors. The UI displays each attribution's summary and identity. Strict photo matching still considers the full eligible pool and allows an unmatched memory to remain without an image.

## Deployment

Apply `migrations/20261006000414_moderation_review.sql` to the Remember database **before deploying this backend or frontend**. It adds flag/reason fields for contributors and questionnaire responses, moderation decisions/timestamps for all four reviewed tables, and separate media blur fields. `schema.sql` includes the same columns for new installations. The migration is additive, repeatable, and does not change RLS or delete records. Preserve the existing migration workflow; these migrations live in the repository's root `migrations/` directory.

A read-only check of the configured Remember database found `moderation_resolution` missing from all four tables. No live schema change was applied during implementation. Existing outputs remain unchanged until regeneration. Local development without an OpenAI key uses the existing mock provider path and cannot establish semantic moderation accuracy.

## Verification and acceptance

Run `npm test` in `backend`; run `node --test tests/*.test.*`, `npm run lint` and `npm run build` in `frontend`. Tests cover fresh flags, persistence failure, pause/resume, approve/edit/move/exclude, ownership and stale decisions, original-file retention through bulk approval, severe versus mild blur, excluded contributor Voices/credits, the Jonah/cousin shared gardening memory, own-source summaries, and rendered moderation controls. The migration was applied twice to an isolated PostgreSQL engine, with decision constraints and existing RLS checked.

Live Memorial A/B acceptance remains required after migration: exercise deliberately bad answers/uploads, review and resume, approve overrides, excluded donor outputs, representative matching/nonmatching photos, anonymous contributor display, archive/search and transcript seek. Automated fixtures validate data flow and guard behavior with mocked providers; they do not establish model accuracy on real memorial content.

The attached Sprint 5/6 specification's **five chapters** remains the working Story requirement; Notion US-8 says six. This change does not resolve that specification discrepancy. The separate Figma Story/Relationship redesign and profile-editing tasks remain outside these review fixes.

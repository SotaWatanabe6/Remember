# Phase 4 Contributor Flow QA

## Test Environment

- Frontend: Next.js app in `frontend`
- Backend: Express API with `NEXT_PUBLIC_API_URL` pointed at the local or deployed Remember API
- Browser route root: `/contribute/:inviteToken`

## Test Invite Token

- Use an active invite token from the `invite_links` table or a seeded environment.
- The token must return `memorial.subject_name`, `memorial.id`, and `invite.is_active: true` from `GET /contribute/:token`.
- Do not use a raw contributor id or backend database id as the invite token.

## Expected Route Sequence

1. `/contribute/:inviteToken`
2. `/contribute/:inviteToken/relationship`
3. `/contribute/:inviteToken/questions`
4. `/contribute/:inviteToken/photos`
5. `/contribute/:inviteToken/voice`
6. `/contribute/:inviteToken/review`
7. `/contribute/:inviteToken/submitted`

`/contribute/:inviteToken/complete` redirects to `/contribute/:inviteToken/submitted`.

## Expected API Calls

- `GET /contribute/:token`
- `POST /contribute/:token/start`
- `POST /contribute/:token/relationship`
- `POST /contribute/:token/responses`
- `POST /contribute/:token/submit`

Submit request body follows the existing contributor token convention:

```json
{
  "contributor_token": "uuid"
}
```

Expected submit response:

```json
{
  "contributor": {
    "id": "uuid",
    "status": "submitted",
    "submitted_at": "timestamp"
  }
}
```

## Manual Verification Checklist

- Invite landing opens with the memorial subject name from `memorial.subject_name`.
- Invalid, inactive, expired, or incomplete invites show a respectful unavailable state.
- Contributor can enter a name and begin a draft.
- Relationship step saves through `POST /relationship` and stores same-browser session state.
- Questionnaire step autosaves through `POST /responses`.
- Photos step can be skipped or can add same-browser local draft photos.
- Voice step can be skipped or can add same-browser local draft audio.
- Review screen shows contributor name, relationship, questionnaire answer count, photos, and audio from local/session state.
- Review edit links return to relationship, questions, photos, and voice routes.
- Submit button calls `POST /submit`, shows a loading state, and prevents duplicate clicks.
- Submit errors show an inline retry state.
- Successful submit navigates to `/submitted`.
- Confirmation page says the contribution was received and references `memorial.subject_name`.
- Confirmation page does not expose contributor ids, memorial ids, raw invite tokens, organizer controls, or login prompts.
- Refresh during the flow preserves same-browser session/localStorage draft state where existing storage support is present.

## Known Limitations

- Backend autosave resume is not supported yet because there is no GET responses endpoint. POST /responses only returns { saved: true }. Same-browser localStorage recovery may work if already implemented, but backend-driven resume is blocked until Phase 5.
- Photo upload and voice upload still use the existing same-browser localStorage/mock upload behavior. Real media upload endpoints are dependent on another branch.
- Review uses local/session state for summaries because backend read endpoints for saved responses/media are not available yet.

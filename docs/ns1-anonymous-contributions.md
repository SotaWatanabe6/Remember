# NS-1: Anonymous contributions

After entering their real name, contributors choose **Show my name** or **Stay anonymous** before selecting their relationship. The layout follows the Figma `Enter name` (`29:4123`) and `Contributor privacy` (`29:4134`) frames. The choice labels and explanatory copy follow NS-1's current requirements.

## Identity contract

- `contributors.name` remains the real name. Organizer approval and archive APIs continue to return it.
- `is_anonymous` is saved through the existing, session-scoped `POST /contribute/:token/privacy` endpoint. It requires a boolean and cannot change after submission.
- `GET /contribute/:token/privacy?contributor_token=...` restores the saved choice and real name for the contributor's own session. It never returns the session secret.
- `display_name` is derived by the backend, separately from `name`: named contributions use the real name; anonymous contributions use `relationship_label`, then `relationship_type`, then `Contributor` if no relationship has been chosen yet. Privacy and relationship saves return this field.
- No schema migration is needed: `is_anonymous`, `relationship_type`, and `relationship_label` already exist. Computing the display field avoids stale values when the contributor chooses a relationship after privacy.
- Public contributor records expose the display name in both `name` (for existing viewers) and `display_name`. Shared and organizer memorial viewer outputs resolve structured attributions on every read, including Story, farewell/credits, constellation quotes, discovery attributions, Voices, and photo credits. New Voices and photo records include contributor IDs so equal display names remain distinct.
- This choice controls attribution labels. It does not edit names someone writes or speaks inside a story, questionnaire answer, or recording.

## Verification

Automated tests exercise real Supabase client requests against in-memory HTTP fixtures: privacy save/restore, relationship changes, named/anonymous reversal, authorization, submission locks, nested legacy outputs, failed identity reads, and organizer access to real names. Frontend service tests cover stale browser state and failed saves.

```sh
cd backend && npm test
cd ../frontend && node --test tests/*.test.*
npm run lint -- --quiet
```

Manual browser checks use a local fixture API, with no production data:

1. Enter a real name and continue; the privacy step follows immediately.
2. Choose Show my name (including when already selected), then use Back from the relationship page. Confirm the choice persists.
3. Choose Stay anonymous, return, and reload. Confirm the anonymous choice persists.
4. Return to name entry; it must still show the real name, never the relationship label.
5. Check desktop and mobile layouts, keyboard navigation, and that a failed save leaves the previous confirmed choice visible.

Verified: 171 backend tests, 42 frontend tests, ESLint, and the normal Turbopack production build pass. Browser checks confirmed both choices advance, the saved choice survives reload, the name entry retains the real name, keyboard selection works, and the mobile layout has no horizontal overflow. The two downloaded Figma assets load at their intended 34 × 36 and 24 × 24 dimensions.

The optional webpack build reports a pre-existing global `body` selector error in `src/app/waitlist/wailtist.module.css`; the project's normal `npm run build` succeeds. No waitlist styles were changed.

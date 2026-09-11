# NS-2: contributor photo review

The contributor review page uses Photos, Voice, and Stories tabs. Photos appear
in a three-column, two-row viewport; additional photos scroll within it.
Removing a photo updates the saved photo list and the local draft only after
the delete API succeeds. Submit is disabled during deletion.

The photo API returns the contributor's submission state so revisiting review
after submission redirects to the submitted page. The delete route requires an
active invitation, a matching contributor and photo, `in_progress` status, and
no previous `submitted_at` timestamp. Deploy the frontend and backend together.

## Automated backend checks

Run `npm test --prefix backend`. The tests execute the real route and Supabase
client against an in-memory HTTP fixture; they do not modify a live database.
Coverage includes ownership, submission state, inactive invitations, failed
storage deletion, deletion followed by a fresh read, and the last-photo flag.

## Browser checks

- Review 0, 1, 6, and more than 6 saved photos at desktop and mobile widths.
- Confirm three columns, two visible rows, scroll access to remaining photos,
  and keyboard access to the tabs and trash buttons.
- Remove a photo, refresh, and confirm it stays removed. Remove the last photo
  and confirm the empty state still permits submission.
- Delay a delete request: repeated deletion and Submit must be disabled.
- Fail a delete request: keep the photo visible, display the error, and allow
  retry. A successful retry clears the previous error.
- Fail the initial photo read: show a retry action and disable Submit instead
  of showing a cached or empty photo list as though loading succeeded.
- Check a missing/unsupported preview: keep the filename and delete control.
- Submit, then revisit review: redirect to the submitted page. A stale open
  review page must receive a rejection when it tries to delete afterward.
- Confirm Voice and Stories content remains accessible in its respective tab.

Story/voice editing persistence belongs to NS-3 and is unchanged here.

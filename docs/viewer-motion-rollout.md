# Viewer motion and rollout

## Behavior

- Screen transitions use a 280ms entrance and 160ms exit. Relationships enters from the right of the portrait, Story from the left, Voices from above, and Photos from below. Returning to navigation reverses the entrance direction.
- Nested lists, person details, chapters and photo views share the same transition lifecycle. Only one view is interactive at a time. Exiting views retain their last route and become inert while the next view enters.
- Story slide changes keep the player mounted, preserve its playback state, and replace the current history entry. Entering a chapter still adds a history entry. Story timers stop immediately when the player exits.
- Voices playback continues while the recording list is open. Changing recordings stops the previous audio element. Leaving Voices pauses audio immediately, before its exit animation completes.
- Native modal dialogs contain focus, handle Escape, lock background scrolling, and restore focus to the opener when it is still present and interactive. Closing an overlay does not change the existing route.
- Reduced motion disables transition travel and duration, hover zoom, and animated loading indicators. Story still starts paused for users who request reduced motion; they can explicitly start playback.
- No backend schema, generation behavior, organizer output components, or share URL format changes are required.

## Local verification

From `frontend/`:

```sh
node --test tests/*.test.mjs tests/*.test.cjs
npm run lint
npm run build
npm run dev -- --webpack -p 3036 --hostname 127.0.0.1
```

Run the browser check in a separate terminal with Playwright available:

```sh
node scripts/verify-viewer-motion.cjs
```

The script accepts `PLAYWRIGHT_MODULE_PATH`, `CHROME_EXECUTABLE`, `PLAYWRIGHT_BROWSERS_PATH`, `VIEWER_TEST_BASE_URL`, and `VIEWER_TEST_ARTIFACT_DIR`. Playwright's FFmpeg runtime is needed for the video recording. It records screenshots and video in a temporary directory by default and prints the artifact path on completion.

All backend calls and audio are intercepted with fixtures. Unrelated external requests are blocked. The check does not read or modify a live memorial.

Coverage includes:

- Section entry, nested Relationships navigation, browser Back/Forward and reloading a person link.
- Long contributor names and keyboard navigation through a long list.
- Native photo and Voices dialogs, focus containment and restoration, Escape, and photo keyboard controls.
- Story history replacement and timer cancellation; Voices playback preservation, recording replacement and exit cleanup.
- Photo archive keyboard tabs, album detail, unavailable media and empty sections.
- Expired links and failed viewer requests.
- Layouts at 1440x1012, 768x1024, 390x844, 320x568 and 844x390, plus reduced motion.
- A browser Back action during a screen transition and checks for duplicate screens and runtime errors.

## Preview and release

1. Review the screenshots and recording from the branch's browser check. Open an existing share link on the preview deployment and repeat the main journeys with real representative content.
2. Smoke-test authenticated `/memorial/:id/intro` and `/memorial/:id/output` entry points. They should continue resolving to the existing public share route. Verify an expired link, a memorial without voices, and a memorial with many contributors.
3. Check keyboard focus, browser history, playback cleanup and reduced motion on the supported desktop and mobile browsers. Chromium automation does not replace Safari/iOS acceptance testing.
4. Deploy after preview acceptance. The release has no database migration or environment-variable changes.
5. After deployment, repeat share-link entry, one person detail, one Story chapter, one recording, and a photo dialog. Inspect browser errors and playback behavior.

## Rollback

Restore the previous frontend deployment if navigation, media cleanup, or access to share links regresses. Existing share tokens and saved memorial output remain valid because this change does not alter backend contracts. If a source rollback is needed, revert the viewer-motion change through a normal commit and redeploy; no data rollback is required.

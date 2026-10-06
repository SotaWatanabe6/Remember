# US-25: Transcript playback synchronization

The Voices output highlights the spoken transcript line and scrolls it into the transcript viewport as the recording plays. This works in organizer outputs, memorial viewers and shared memorial viewers through the shared `VoiceRecordingCard`.

## Playback behavior

- Timed lines render once, without duplicating the full transcript above them. The current line has a colored background, a left border and `aria-current`.
- Playback and native seek events drive synchronization. Waveform clicks and keyboard seeking update the transcript immediately; Arrow Left/Right, Home and End remain available.
- Timing is start-inclusive and end-exclusive. Pauses between lines and the end of speech have no active line. Pausing retains the current position; resuming continues from it. Ending retains the final position until replay.
- Automatic scrolling stays inside the transcript pane. It never scrolls the page and respects reduced motion. The pane is keyboard accessible.
- Switching recordings stops the removed player's audio. Organizer cards pause the previous recording when another starts.
- Missing, invalid or partly timed segments fall back to the full plain transcript, or their joined text if no full transcript exists. Missing audio disables playback while retaining readable text. No timestamps are estimated from recording length or word count.

## Data contract and generation

`voice_recordings.transcript_segments` already exists as JSONB; no migration is required. Generated `voices` now includes the segments and `duration_seconds` alongside the existing text and audio URL:

```json
{
  "transcript_text": "Every Sunday. Together again.",
  "transcript_segments": [
    { "start": 0.25, "end": 1.2, "text": "Every Sunday." },
    { "start": 1.8, "end": 3, "text": "Together again." }
  ],
  "duration_seconds": 10
}
```

All segment timestamps are seconds relative to the original recording. [AssemblyAI word timestamps](https://www.assemblyai.com/docs/pre-recorded-audio/api-reference/transcripts/get) are converted from milliseconds once in the backend, then grouped at sentence endings, pauses, twelve words or eight seconds. Speaker diarization remains disabled. The frontend also accepts existing `start_time`/`end_time`, `startTime`/`endTime` and `start_seconds`/`end_seconds` aliases, in seconds.

Generation uses `ASSEMBLYAI_API_KEY` for transcription independently of OpenAI highlight extraction. Timings survive unavailable or failed highlight extraction. Already timed recordings are reused. When generation encounters an older recording with text but no segments, it transcribes the original audio for timing while preserving the existing quote, category, intro and clip boundaries. Provider or persistence failures preserve the previous output text. Already generated memorial JSON remains static until generated again; this change does not rewrite deployed outputs or run transcription on a live service.

## Verification

```sh
cd backend
npm test
cd ../frontend
node --test tests/*.test.*
npm run lint -- --quiet
npm run build
```

180 backend tests and 52 frontend tests pass, as do lint and the production build. New regressions cover timestamp units, line grouping, silence boundaries, seeking, malformed timing, highlight fallbacks, saved output fields and safe legacy backfill.

The optional browser regression uses Playwright with a local Next.js server and isolated HTTP fixtures, including seekable WAV audio. It verifies natural playback, pause/resume, keyboard seeking, scrolling, transcript fallback, disabled missing audio, recording changes, shared viewers, organizer playback and overflow at 390px and 320px. It aborts external requests and never writes to a live backend.

```sh
# Start the frontend on port 3045 in another terminal.
npm run dev -- --hostname 127.0.0.1 --port 3045

# Run with Playwright available; optionally set PLAYWRIGHT_MODULE_PATH and
# CHROME_EXECUTABLE to existing runtime/browser installations.
node scripts/verify-voice-transcript.cjs
```

`VOICE_TEST_BASE_URL` overrides the local server URL. `VOICE_TEST_ARTIFACT_DIR` selects the screenshot directory; it defaults to the system temporary directory.

## Figma verification limitation

The supplied [Figma file](https://www.figma.com/design/AWRSCFqEjTHcSYmBuayGF6/Remember-Designs---Developer-Reference--Copy-?node-id=264-1179) returned page metadata, including the Voices and Voices/List frames, but its Starter plan tool limit blocked design context and screenshot retrieval. The implementation extends the existing Voices layout and Remember tokens. A visual comparison against Kiara's latest wireframe remains unverified.

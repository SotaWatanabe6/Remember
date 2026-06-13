// frontend/src/components/contributor/AnswerModeToggle.jsx

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.08A7 7 0 0 0 19 11z" />
    </svg>
  );
}

function WaveformBars({ active }) {
  const heights = [10, 18, 8, 22, 12, 20, 9, 16, 11];

  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={index}
          className={`w-[3px] rounded-full ${active ? "animate-pulse" : ""}`}
          style={{ height: `${height}px`, backgroundColor: "currentColor" }}
        />
      ))}
    </div>
  );
}

export default function AnswerModeToggle({
  inputMode,
  isListening,
  speechSupported,
  onModeChange,
  onToggleListening,
}) {
  function handleClick() {
    if (!speechSupported) return;

    if (inputMode !== "speech") {
      onModeChange("speech");
    }

    onToggleListening();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={!speechSupported}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop recording your answer" : "Record your answer"}
        className="flex items-center gap-3 self-start transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: isListening ? "var(--color-r-accent)" : "var(--color-r-text)" }}
      >
        <MicIcon />
        <WaveformBars active={isListening} />
      </button>

      {isListening ? (
        <p className="text-caption text-r-accent">Listening… tap the mic to stop.</p>
      ) : null}

      {!speechSupported ? (
        <p className="text-caption text-r-muted">
          Speech input is not supported in this browser. You can still type your answer.
        </p>
      ) : null}
    </div>
  );
}

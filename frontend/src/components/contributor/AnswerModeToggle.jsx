// frontend/src/components/contributor/AnswerModeToggle.jsx

const WAVEFORM_PATH = "M25.0007 5.2085C25.7775 5.20853 26.5265 5.49791 27.1015 6.0202C27.6766 6.54249 28.0365 7.26025 28.1111 8.0335L28.1257 8.3335V41.6668C28.1253 42.4694 27.8161 43.241 27.2623 43.8218C26.7085 44.4026 25.9524 44.7481 25.1508 44.7867C24.3492 44.8252 23.5635 44.5539 22.9565 44.029C22.3495 43.504 21.9677 42.7656 21.8902 41.9668L21.8757 41.6668V8.3335C21.8757 7.50469 22.2049 6.70984 22.7909 6.12379C23.377 5.53774 24.1718 5.2085 25.0007 5.2085ZM16.6673 11.4585C17.4961 11.4585 18.291 11.7877 18.877 12.3738C19.4631 12.9598 19.7923 13.7547 19.7923 14.5835V35.4168C19.7923 36.2456 19.4631 37.0405 18.877 37.6265C18.291 38.2126 17.4961 38.5418 16.6673 38.5418C15.8385 38.5418 15.0437 38.2126 14.4576 37.6265C13.8716 37.0405 13.5423 36.2456 13.5423 35.4168V14.5835C13.5423 13.7547 13.8716 12.9598 14.4576 12.3738C15.0437 11.7877 15.8385 11.4585 16.6673 11.4585ZM33.334 11.4585C34.1628 11.4585 34.9576 11.7877 35.5437 12.3738C36.1297 12.9598 36.459 13.7547 36.459 14.5835V35.4168C36.459 36.2456 36.1297 37.0405 35.5437 37.6265C34.9576 38.2126 34.1628 38.5418 33.334 38.5418C32.5052 38.5418 31.7103 38.2126 31.1243 37.6265C30.5382 37.0405 30.209 36.2456 30.209 35.4168V14.5835C30.209 13.7547 30.5382 12.9598 31.1243 12.3738C31.7103 11.7877 32.5052 11.4585 33.334 11.4585ZM8.33398 17.7085C9.16279 17.7085 9.95764 18.0377 10.5437 18.6238C11.1297 19.2098 11.459 20.0047 11.459 20.8335V29.1668C11.459 29.9956 11.1297 30.7905 10.5437 31.3765C9.95764 31.9626 9.16279 32.2918 8.33398 32.2918C7.50518 32.2918 6.71033 31.9626 6.12428 31.3765C5.53822 30.7905 5.20898 29.9956 5.20898 29.1668V20.8335C5.20898 20.0047 5.53822 19.2098 6.12428 18.6238C6.71033 18.0377 7.50518 17.7085 8.33398 17.7085ZM41.6673 17.7085C42.4442 17.7085 43.1931 17.9979 43.7682 18.5202C44.3432 19.0425 44.7032 19.7602 44.7777 20.5335L44.7923 20.8335V29.1668C44.7919 29.9694 44.4828 30.741 43.929 31.3218C43.3751 31.9026 42.6191 32.2481 41.8175 32.2867C41.0159 32.3252 40.2302 32.0539 39.6231 31.529C39.0161 31.004 38.6343 30.2656 38.5569 29.4668L38.5423 29.1668V20.8335C38.5423 20.0047 38.8716 19.2098 39.4576 18.6238C40.0437 18.0377 40.8385 17.7085 41.6673 17.7085Z";

function MicIcon({ listening }) {
  if (listening) {
    return (
      <svg width="50" height="50" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
    );
  }

  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
      <path
        d="M24.9993 4.1665C26.657 4.1665 28.2467 4.82498 29.4188 5.99709C30.5909 7.16919 31.2493 8.7589 31.2493 10.4165V22.9165C31.2493 24.5741 30.5909 26.1638 29.4188 27.3359C28.2467 28.508 26.657 29.1665 24.9993 29.1665C23.3417 29.1665 21.752 28.508 20.5799 27.3359C19.4078 26.1638 18.7493 24.5741 18.7493 22.9165V10.4165C18.7493 8.7589 19.4078 7.16919 20.5799 5.99709C21.752 4.82498 23.3417 4.1665 24.9993 4.1665ZM39.5827 22.9165C39.5827 30.2707 34.1452 36.3332 27.0827 37.354V43.7498H22.916V37.354C15.8535 36.3332 10.416 30.2707 10.416 22.9165H14.5827C14.5827 25.6792 15.6801 28.3287 17.6337 30.2822C19.5872 32.2357 22.2367 33.3332 24.9993 33.3332C27.762 33.3332 30.4115 32.2357 32.365 30.2822C34.3185 28.3287 35.416 25.6792 35.416 22.9165H39.5827Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Waveform() {
  return (
    <div className="flex items-center" style={{ gap: 0 }} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <svg
          key={i}
          width="50"
          height="50"
          viewBox="0 0 50 50"
          fill="none"
          style={{ marginLeft: i > 0 ? "-9px" : 0 }}
        >
          <path d={WAVEFORM_PATH} fill="var(--color-r-text)" />
        </svg>
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
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleClick}
          disabled={!speechSupported}
          aria-pressed={isListening}
          title={
            !speechSupported
              ? "Speech recognition not supported in this browser"
              : isListening
                ? "Stop recording"
                : "Record your answer"
          }
          aria-label={isListening ? "Stop recording" : "Record your answer"}
          className="transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ color: isListening ? "var(--color-r-danger)" : "var(--color-r-text)" }}
        >
          <MicIcon listening={isListening} />
        </button>

        <Waveform />
      </div>

      {isListening ? (
        <p className="text-caption" style={{ color: "var(--color-r-danger)" }}>
          Listening... speak now. Tap the mic button again to stop.
        </p>
      ) : null}

      {!speechSupported ? (
        <p className="text-caption text-r-muted">
          Speech input is not supported in this browser. You can still type your answer.
        </p>
      ) : null}
    </div>
  );
}

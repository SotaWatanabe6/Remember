export default function AnswerModeToggle({
  inputMode,
  isListening,
  speechSupported,
  onModeChange,
  onToggleListening,
}) {
  const isSpeechMode = inputMode === "speech";

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-2 gap-2 rounded-[13px] bg-slate-100 p-1"
        role="group"
        aria-label="Answer input mode"
      >
        <button
          type="button"
          onClick={() => onModeChange("text")}
          className={`h-11 rounded-[10px] px-4 text-base font-medium leading-6 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
            inputMode === "text"
              ? "bg-white text-neutral-950 shadow-auth"
              : "text-slate-600 hover:text-neutral-950"
          }`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => onModeChange("speech")}
          className={`h-11 rounded-[10px] px-4 text-base font-medium leading-6 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
            isSpeechMode
              ? "bg-white text-neutral-950 shadow-auth"
              : "text-slate-600 hover:text-neutral-950"
          }`}
        >
          Mic
        </button>
      </div>

      {isSpeechMode && speechSupported ? (
        <button
          type="button"
          onClick={onToggleListening}
          className={`flex h-12 w-full items-center justify-center rounded-full px-6 text-base font-bold leading-6 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 ${
            isListening
              ? "bg-slate-700 text-white hover:bg-slate-600"
              : "bg-neutral-950 text-white hover:bg-neutral-800"
          }`}
        >
          {isListening ? "Stop speaking" : "Start speaking"}
        </button>
      ) : null}

      {isSpeechMode && !speechSupported ? (
        <p className="rounded-[13px] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Speech input is not supported in this browser. You can still type your answer.
        </p>
      ) : null}
    </div>
  );
}

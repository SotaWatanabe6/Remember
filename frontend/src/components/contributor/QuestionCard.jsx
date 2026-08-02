// frontend/src/components/contributor/QuestionCard.jsx

import AnswerModeToggle from "@/components/contributor/AnswerModeToggle.jsx";
import AutosaveStatus from "@/components/contributor/AutosaveStatus.jsx";
import MemoryOrb from "@/components/contributor/MemoryOrb.jsx";

export default function QuestionCard({
  question,
  answerText,
  inputMode,
  autosaveStatus,
  isListening,
  speechSupported,
  error,
  onAnswerChange,
  onAnswerBlur,
  onModeChange,
  onToggleListening,
}) {
  const errorId = error ? `question-answer-${question.id}-error` : undefined;

  return (
    <section className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-h1 text-r-text">{question.prompt}</h1>
        <p className="mt-2 text-body-2 text-r-secondary">Type or record your answer below.</p>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
        <MemoryOrb className="hidden h-44 w-44 shrink-0 sm:block sm:h-56 sm:w-56" />

        <div className="flex w-full max-w-[480px] flex-col gap-3">
          <AnswerModeToggle
            inputMode={inputMode}
            isListening={isListening}
            speechSupported={speechSupported}
            onModeChange={onModeChange}
            onToggleListening={onToggleListening}
          />

          <label htmlFor={`question-answer-${question.id}`} className="sr-only">
            Your answer
          </label>
          <textarea
            id={`question-answer-${question.id}`}
            value={answerText}
            onChange={(event) => onAnswerChange(event.target.value)}
            onFocus={(event) => { event.target.style.borderColor = "var(--color-r-border-focus)"; }}
            onBlur={(event) => {
              event.target.style.borderColor = "var(--color-r-border)";
              onAnswerBlur();
            }}
            placeholder="This is an example of an answer the user would give. It would either be a typed out answer or this would be the transcript of the audio recorded by the user."
            rows={6}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className="min-h-[180px] w-full resize-y rounded-2xl bg-transparent px-5 py-4 text-body-2 text-r-text outline-none transition placeholder:text-r-muted"
            style={{ border: "1px solid var(--color-r-border)" }}
          />
          {error ? (
            <p id={errorId} className="text-sm leading-5 text-r-danger" role="alert">
              {error}
            </p>
          ) : null}

          <AutosaveStatus status={autosaveStatus} />
        </div>
      </div>
    </section>
  );
}

import AnswerModeToggle from "@/components/contributor/AnswerModeToggle.jsx";
import AutosaveStatus from "@/components/contributor/AutosaveStatus.jsx";

export default function QuestionCard({
  question,
  answerText,
  inputMode,
  autosaveStatus,
  isListening,
  speechSupported,
  onAnswerChange,
  onAnswerBlur,
  onModeChange,
  onToggleListening,
}) {
  return (
    <section className="flex w-full flex-col gap-6 rounded-[18px] border border-slate-200 bg-white p-5 text-left shadow-auth sm:p-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-[30px] font-medium leading-[38px] text-neutral-950 sm:text-[40px] sm:leading-[48px]">
          {question.prompt}
        </h1>
        <p className="text-base leading-7 text-slate-600 sm:text-lg">{question.helperText}</p>
      </div>

      <AnswerModeToggle
        inputMode={inputMode}
        isListening={isListening}
        speechSupported={speechSupported}
        onModeChange={onModeChange}
        onToggleListening={onToggleListening}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor={`question-answer-${question.id}`} className="sr-only">
          Your answer
        </label>
        <textarea
          id={`question-answer-${question.id}`}
          value={answerText}
          onChange={(event) => onAnswerChange(event.target.value)}
          onBlur={onAnswerBlur}
          placeholder="Share it in your own words. A few lines is enough."
          rows={8}
          className="min-h-[220px] w-full resize-y rounded-[13px] border border-[#cad5e2] bg-white px-5 py-4 text-lg leading-8 text-neutral-950 outline-none transition placeholder:text-neutral-950/45 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <div className="flex items-start justify-between gap-4">
          <AutosaveStatus status={autosaveStatus} />
          <p className="shrink-0 text-sm leading-6 text-slate-500">
            {answerText.length.toLocaleString()} characters
          </p>
        </div>
      </div>
    </section>
  );
}

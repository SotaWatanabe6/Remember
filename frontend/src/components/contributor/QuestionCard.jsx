// frontend/src/components/contributor/QuestionCard.jsx

import ContributionTextField from "@/components/contributor/ContributionTextField.jsx";
import AutosaveStatus from "@/components/contributor/AutosaveStatus.jsx";
import MemorialCoverImage from "@/components/memorial/MemorialCoverImage.jsx";

export default function QuestionCard({
  question,
  subjectName,
  profilePhotoUrl,
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
        <MemorialCoverImage src={profilePhotoUrl} name={subjectName} width={224} height={224}
          className="hidden h-44 w-44 shrink-0 sm:block sm:h-56 sm:w-56" />

        <div className="flex w-full max-w-[480px] flex-col gap-3">
          <ContributionTextField
            id={`question-answer-${question.id}`}
            label="Your answer"
            recording={isListening}
            recordingDisabled={!speechSupported}
            recordingLabel={isListening ? 'Stop recording' : 'Record your answer'}
            onToggleRecording={() => {
              if (inputMode !== 'speech') onModeChange('speech');
              onToggleListening();
            }}
            value={answerText}
            onChange={(event) => onAnswerChange(event.target.value)}
            onBlur={onAnswerBlur}
            placeholder="This is an example of an answer the user would give. It would either be a typed out answer or this would be the transcript of the audio recorded by the user."
            rows={6}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
          {isListening ? <p className="text-caption text-r-danger">Listening… speak now. Tap the microphone again to stop.</p> : null}
          {!speechSupported ? <p className="text-caption text-r-muted">Speech input is not supported in this browser. You can still type your answer.</p> : null}
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

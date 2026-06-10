"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "@/components/contributor/QuestionCard.jsx";
import QuestionProgress from "@/components/contributor/QuestionProgress.jsx";
import { CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS } from "@/lib/contribute/questionnaireQuestions.js";
import {
  getContributorQuestionnaireDraft,
  getQuestionnaireResponses,
  saveQuestionnaireResponse,
} from "@/services/contributorService.js";

const questionnaireErrorCopy = {
  invalid: {
    title: "This invitation link is not available",
    body: "Please check the link or ask the memorial organizer to send a new invitation.",
  },
  expired: {
    title: "This invitation has expired",
    body: "The contribution window for this link has passed. The organizer can share a new link if they are still collecting memories.",
  },
  closed: {
    title: "Contributions are closed",
    body: "This memorial is not accepting new contributions right now. Thank you for wanting to share a memory.",
  },
  missing: {
    title: "We could not find your contribution draft",
    body: "Please return to the invitation page and enter your name before sharing memories.",
  },
  relationship_missing: {
    title: "Choose your relationship first",
    body: "Before the questions, please tell the family how you knew them.",
  },
  error: {
    title: "We could not open your questions",
    body: "Please return to the invitation page and try again.",
  },
};

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-r-bg px-6 py-10 text-neutral-950 sm:px-[50px]">
      <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <div className="size-12 rounded-full border-2 border-slate-200 border-t-neutral-950" />
        <p className="text-base leading-6 text-slate-600">Opening your questions...</p>
      </section>
    </main>
  );
}

function QuestionnaireErrorState({ status, inviteToken }) {
  const copy = questionnaireErrorCopy[status] ?? questionnaireErrorCopy.invalid;
  const href =
    status === "relationship_missing"
      ? `/contribute/${inviteToken}/relationship`
      : `/contribute/${inviteToken}`;
  const linkText = status === "relationship_missing" ? "Choose relationship" : "Return to invitation";

  return (
    <main className="flex min-h-screen items-center justify-center bg-r-bg px-6 py-10 text-neutral-950 sm:px-[50px]">
      <section className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-medium text-slate-600">
          R
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-[32px] font-medium leading-[38px] text-neutral-950 sm:text-[40px] sm:leading-[48px]">
            {copy.title}
          </h1>
          <p className="text-base leading-7 text-slate-600 sm:text-lg">{copy.body}</p>
        </div>
        {status === "missing" || status === "relationship_missing" ? (
          <a
            href={href}
            className="mt-2 flex h-[52px] items-center justify-center rounded-full bg-neutral-950 px-8 text-base font-bold leading-6 text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500"
          >
            {linkText}
          </a>
        ) : null}
      </section>
    </main>
  );
}

function createEmptyAnswer() {
  return {
    answer_text: "",
    input_mode: "text",
    saved_at: null,
  };
}

function serializeAnswer(answer) {
  return JSON.stringify({
    answer_text: answer.answer_text ?? "",
    input_mode: answer.input_mode ?? "text",
  });
}

function buildAnswersByQuestion(responses) {
  return responses.reduce((answers, response) => {
    answers[response.question_id] = {
      answer_text: response.answer_text ?? "",
      input_mode: response.input_mode === "speech" ? "speech" : "text",
      saved_at: response.saved_at ?? null,
    };

    return answers;
  }, {});
}

function buildLastSavedAnswers(responses) {
  return responses.reduce((savedAnswers, response) => {
    savedAnswers[response.question_id] = serializeAnswer({
      answer_text: response.answer_text ?? "",
      input_mode: response.input_mode === "speech" ? "speech" : "text",
    });
    return savedAnswers;
  }, {});
}

function getResumeQuestionIndex(answersByQuestion) {
  const firstUnansweredIndex = CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.findIndex((question) => {
    const answer = answersByQuestion[question.id]?.answer_text ?? "";
    return !answer.trim();
  });

  return firstUnansweredIndex === -1 ? CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.length : firstUnansweredIndex;
}

export default function QuestionnaireFlow({ inviteToken }) {
  const router = useRouter();
  const [draft, setDraft] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  );

  const answersRef = useRef(answers);
  const currentQuestionIdRef = useRef(CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS[0]?.id);
  const lastSavedAnswersRef = useRef({});
  const saveTimerRef = useRef(null);
  const saveRequestVersionsRef = useRef({});
  const saveAbortControllersRef = useRef({});
  const recognitionRef = useRef(null);

  const currentQuestion = CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS[currentIndex];
  const currentAnswer = answers[currentQuestion.id] ?? createEmptyAnswer();
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.length - 1;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    currentQuestionIdRef.current = currentQuestion?.id;
    const savedAnswer = answersRef.current[currentQuestion?.id] ?? createEmptyAnswer();
    const lastSavedAnswer = lastSavedAnswersRef.current[currentQuestion?.id];

    if (!lastSavedAnswer) {
      setAutosaveStatus("idle");
    } else if (lastSavedAnswer === serializeAnswer(savedAnswer)) {
      setAutosaveStatus("saved");
    } else {
      setAutosaveStatus("idle");
    }
  }, [currentQuestion?.id]);

  useEffect(() => {
    let isMounted = true;
    const saveAbortControllers = saveAbortControllersRef.current;

    async function loadQuestionnaire() {
      setIsLoading(true);
      let questionnaireDraft;

      try {
        questionnaireDraft = await getContributorQuestionnaireDraft(inviteToken);
      } catch (error) {
        console.error("Failed to load contributor questionnaire draft.", error);
        questionnaireDraft = {
          status: "error",
          invite: null,
          session: null,
        };
      }

      if (!isMounted) {
        return;
      }

      setDraft(questionnaireDraft);

      if (questionnaireDraft.status !== "ready") {
        setIsLoading(false);
        return;
      }

      try {
        const savedResponses = await getQuestionnaireResponses(inviteToken);

        if (!isMounted) {
          return;
        }

        const restoredAnswers = buildAnswersByQuestion(savedResponses);
        setAnswers(restoredAnswers);
        lastSavedAnswersRef.current = buildLastSavedAnswers(savedResponses);

        const resumeIndex = getResumeQuestionIndex(restoredAnswers);
        if (resumeIndex >= CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.length) {
          router.replace(`/contribute/${inviteToken}/questions-review`);
          return;
        }

        setCurrentIndex(resumeIndex);

        const currentSavedAnswer =
          lastSavedAnswersRef.current[CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS[resumeIndex].id];
        setAutosaveStatus(currentSavedAnswer ? "saved" : "idle");
      } catch {
        if (isMounted) {
          setAutosaveStatus("error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuestionnaire();

    return () => {
      isMounted = false;
      window.clearTimeout(saveTimerRef.current);
      recognitionRef.current?.stop();
      Object.values(saveAbortControllers).forEach((controller) => controller.abort());
    };
  }, [inviteToken, router]);

  const saveAnswer = useCallback(
    async (questionId, answerSnapshot, { force = false } = {}) => {
      const questionIndex = CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.findIndex(
        (question) => question.id === questionId,
      );

      if (questionIndex < 0) {
        return;
      }

      const answerToSave = answerSnapshot ?? createEmptyAnswer();
      const serializedAnswer = serializeAnswer(answerToSave);

      if (!force && !(answerToSave.answer_text ?? "").trim()) {
        if (currentQuestionIdRef.current === questionId) {
          setAutosaveStatus("idle");
        }
        return true;
      }

      if (lastSavedAnswersRef.current[questionId] === serializedAnswer) {
        if (currentQuestionIdRef.current === questionId) {
          setAutosaveStatus("saved");
        }
        return true;
      }

      if (currentQuestionIdRef.current === questionId) {
        setAutosaveStatus("saving");
      }

      saveAbortControllersRef.current[questionId]?.abort();
      const controller = new AbortController();
      saveAbortControllersRef.current[questionId] = controller;
      const requestVersion = (saveRequestVersionsRef.current[questionId] ?? 0) + 1;
      saveRequestVersionsRef.current[questionId] = requestVersion;

      try {
        const savedResponse = await saveQuestionnaireResponse(inviteToken, {
          questionId,
          questionText: CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS[questionIndex].prompt,
          questionOrder: questionIndex + 1,
          answerText: answerToSave.answer_text ?? "",
          inputMode: answerToSave.input_mode ?? "text",
        }, {
          signal: controller.signal,
        });

        if (saveRequestVersionsRef.current[questionId] !== requestVersion) {
          return true;
        }

        const savedSerializedAnswer = serializeAnswer({
          answer_text: savedResponse.answer_text ?? answerToSave.answer_text ?? "",
          input_mode: savedResponse.input_mode ?? answerToSave.input_mode ?? "text",
        });
        lastSavedAnswersRef.current[questionId] = savedSerializedAnswer;

        setAnswers((currentAnswers) => ({
          ...currentAnswers,
          [questionId]: {
            ...(currentAnswers[questionId] ?? createEmptyAnswer()),
            saved_at: savedResponse.saved_at ?? new Date().toISOString(),
          },
        }));

        if (currentQuestionIdRef.current === questionId) {
          const currentSerializedAnswer = serializeAnswer(
            answersRef.current[questionId] ?? createEmptyAnswer(),
          );
          setAutosaveStatus(
            currentSerializedAnswer === savedSerializedAnswer ? "saved" : "saving",
          );
        }
        return true;
      } catch (error) {
        if (error?.code === "aborted") {
          return false;
        }

        if (currentQuestionIdRef.current === questionId) {
          setAutosaveStatus("error");
        }
        return false;
      } finally {
        if (saveAbortControllersRef.current[questionId] === controller) {
          delete saveAbortControllersRef.current[questionId];
        }
      }
    },
    [draft, inviteToken],
  );

  const queueSave = useCallback(
    (questionId, answerSnapshot, delayMs = 2000) => {
      window.clearTimeout(saveTimerRef.current);

      if (currentQuestionIdRef.current === questionId) {
        setAutosaveStatus("saving");
      }

      saveTimerRef.current = window.setTimeout(() => {
        saveAnswer(questionId, answerSnapshot);
      }, delayMs);
    },
    [saveAnswer],
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleAnswerChange = (answerText) => {
    const questionId = currentQuestion.id;
    const nextAnswer = {
      ...(answersRef.current[questionId] ?? createEmptyAnswer()),
      answer_text: answerText,
    };

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: nextAnswer,
    }));
    queueSave(questionId, nextAnswer);
  };

  const handleAnswerBlur = () => {
    window.clearTimeout(saveTimerRef.current);
    saveAnswer(currentQuestion.id, answersRef.current[currentQuestion.id] ?? createEmptyAnswer());
  };

  const handleModeChange = (inputMode) => {
    const questionId = currentQuestion.id;
    const nextAnswer = {
      ...(answersRef.current[questionId] ?? createEmptyAnswer()),
      input_mode: inputMode,
    };

    if (inputMode === "text") {
      stopListening();
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: nextAnswer,
    }));

    if (nextAnswer.answer_text) {
      queueSave(questionId, nextAnswer);
    }
  };

  const appendSpeechTranscript = useCallback(
    (transcript) => {
      const cleanedTranscript = transcript.trim();

      if (!cleanedTranscript) {
        return;
      }

      const questionId = currentQuestionIdRef.current;
      const existingAnswer = answersRef.current[questionId] ?? createEmptyAnswer();
      const separator = existingAnswer.answer_text.trim() ? " " : "";
      const nextAnswer = {
        ...existingAnswer,
        answer_text: `${existingAnswer.answer_text}${separator}${cleanedTranscript}`,
        input_mode: "speech",
      };

      setAnswers((currentAnswers) => ({
        ...currentAnswers,
        [questionId]: nextAnswer,
      }));
      queueSave(questionId, nextAnswer, 1200);
    },
    [queueSave],
  );

  const handleToggleListening = () => {
    if (!speechSupported) {
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = window.navigator.language || "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");

      appendSpeechTranscript(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const moveToQuestion = async (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.length) {
      return;
    }

    setIsNavigating(true);
    stopListening();
    window.clearTimeout(saveTimerRef.current);
    const didSave = await saveAnswer(
      currentQuestion.id,
      answersRef.current[currentQuestion.id] ?? createEmptyAnswer(),
      { force: true },
    );
    if (!didSave) {
      setIsNavigating(false);
      return;
    }
    setCurrentIndex(nextIndex);
    setIsNavigating(false);
  };

  const handleContinue = async () => {
  if (!isLastQuestion) {
    await moveToQuestion(currentIndex + 1);
    return;
  }

  setIsNavigating(true);
  stopListening();
  window.clearTimeout(saveTimerRef.current);
  const didSave = await saveAnswer(
    currentQuestion.id,
    answersRef.current[currentQuestion.id] ?? createEmptyAnswer(),
    { force: true },
  );
  if (!didSave) {
    setIsNavigating(false);
    return;
  }
  router.push(`/contribute/${inviteToken}/questions-review`);
 };

  useEffect(() => {
    const flushCurrentAnswer = () => {
      window.clearTimeout(saveTimerRef.current);
      const questionId = currentQuestionIdRef.current;

      if (!questionId) {
        return;
      }

      saveAnswer(questionId, answersRef.current[questionId] ?? createEmptyAnswer(), { force: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCurrentAnswer();
      }
    };

    window.addEventListener("pagehide", flushCurrentAnswer);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushCurrentAnswer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveAnswer]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!draft || draft.status !== "ready") {
    return <QuestionnaireErrorState status={draft?.status ?? "invalid"} inviteToken={inviteToken} />;
  }

  return (
    <main className="min-h-screen bg-r-bg px-6 py-8 text-neutral-950 sm:px-[50px] sm:py-[50px]">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[760px] flex-col justify-center gap-7 sm:min-h-[calc(100vh-100px)]">
        <section className="flex flex-col gap-4 text-center">
          <p className="text-sm font-medium uppercase leading-5 text-slate-500">
            Contribution for {draft.invite.deceased.name}
          </p>
          <p className="mx-auto max-w-[560px] text-base leading-7 text-slate-600 sm:text-lg">
            Share what you remember in whatever shape it comes. You can skip a question and come
            back as you go.
          </p>
        </section>

        <QuestionProgress
          currentIndex={currentIndex}
          totalQuestions={CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.length}
        />

        <QuestionCard
          question={currentQuestion}
          answerText={currentAnswer.answer_text}
          inputMode={currentAnswer.input_mode}
          autosaveStatus={autosaveStatus}
          isListening={isListening}
          speechSupported={speechSupported}
          onAnswerChange={handleAnswerChange}
          onAnswerBlur={handleAnswerBlur}
          onModeChange={handleModeChange}
          onToggleListening={handleToggleListening}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => moveToQuestion(currentIndex - 1)}
            disabled={isFirstQuestion || isNavigating}
            className="flex h-[56px] items-center justify-center rounded-full border border-slate-300 bg-white px-8 text-base font-bold leading-6 text-neutral-950 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={isNavigating}
            className="flex h-[56px] items-center justify-center rounded-full bg-neutral-950 px-10 text-base font-bold leading-6 text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {isNavigating ? "Saving..." : isLastQuestion ? "Continue" : "Next"}
          </button>
        </div>
      </div>
    </main>
  );
}

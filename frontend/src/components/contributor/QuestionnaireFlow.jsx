"use client";

// frontend/src/components/contributor/QuestionnaireFlow.jsx

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuestionCard from "@/components/contributor/QuestionCard.jsx";
import MemoryOrb from "@/components/contributor/MemoryOrb.jsx";
import { CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS, formatQuestionPrompt } from "@/lib/contribute/questionnaireQuestions.js";
import {
  getContributorQuestionnaireDraft,
  getQuestionnaireResponses,
  saveQuestionnaireResponse,
} from "@/services/contributorService.js";

const QUESTIONNAIRE_DRAFT_STORAGE_PREFIX = "remember_questionnaire_draft";

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

function ContributorNav({ onBack }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 sm:px-[50px] py-6">
      <div className="flex items-center gap-2">
        <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
        <span className="text-r-text text-2xl leading-8 [font-family:var(--font-family-display)]">Remember</span>
      </div>
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-r-text transition-opacity hover:opacity-70">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z" fill="currentColor"/>
        </svg>
        <span className="text-base font-normal">Back</span>
      </button>
    </nav>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-r-bg text-r-text px-6 py-10 sm:px-[50px]">
      <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <div className="size-12 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-r-border)', borderTopColor: 'var(--color-r-text)' }} />
        <p className="text-body-2 text-r-secondary">Opening your questions...</p>
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
    <main className="flex min-h-screen items-center justify-center bg-r-bg text-r-text px-6 py-10 sm:px-[50px]">
      <section className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-r-card text-2xl font-medium text-r-secondary">
          R
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-h1 text-r-text">{copy.title}</h1>
          <p className="text-body-2 text-r-secondary">{copy.body}</p>
        </div>
        {status === "missing" || status === "relationship_missing" ? (
          <Link
            href={href}
            className="mt-2 flex h-[56px] items-center justify-center rounded-full px-8 text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
          >
            {linkText}
          </Link>
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

function getQuestionnaireDraftStorageKey(inviteToken, contributorId) {
  return `${QUESTIONNAIRE_DRAFT_STORAGE_PREFIX}:${inviteToken}:${contributorId}`;
}

function readStoredQuestionnaireDraft(inviteToken, contributorId) {
  if (typeof window === "undefined" || !inviteToken || !contributorId) {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(getQuestionnaireDraftStorageKey(inviteToken, contributorId));
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed.answers ?? {} : {};
  } catch (error) {
    console.warn("Unable to load saved questionnaire draft.", error);
    return {};
  }
}

function storeQuestionnaireDraft(inviteToken, contributorId, answersByQuestion) {
  if (typeof window === "undefined" || !inviteToken || !contributorId) {
    return;
  }

  try {
    window.localStorage.setItem(
      getQuestionnaireDraftStorageKey(inviteToken, contributorId),
      JSON.stringify({
        answers: answersByQuestion,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn("Unable to save questionnaire draft.", error);
  }
}

function getResumeQuestionIndex(answersByQuestion) {
  const firstUnansweredIndex = CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.findIndex((question) => {
    const answer = answersByQuestion[question.id]?.answer_text ?? "";
    return !answer.trim();
  });

  return firstUnansweredIndex === -1 ? CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.length : firstUnansweredIndex;
}

function hasAnyAnswer(answersByQuestion) {
  return Object.values(answersByQuestion).some((answer) => (answer.answer_text ?? "").trim());
}

export default function QuestionnaireFlow({ inviteToken }) {
  const router = useRouter();
  const [draft, setDraft] = useState(null);
  const [step, setStep] = useState("intro"); // "intro" | "question"
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [answerError, setAnswerError] = useState("");
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
  const currentAnswer = answers[currentQuestion?.id] ?? createEmptyAnswer();
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

        const localAnswers = readStoredQuestionnaireDraft(
          inviteToken,
          questionnaireDraft.session.contributorId,
        );
        const serverAnswers = buildAnswersByQuestion(savedResponses);
        const restoredAnswers = {
          ...localAnswers,
          ...serverAnswers,
        };
        setAnswers(restoredAnswers);
        lastSavedAnswersRef.current = buildLastSavedAnswers(savedResponses);

        const resumeIndex = getResumeQuestionIndex(restoredAnswers);
        if (resumeIndex >= CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.length) {
          router.replace(`/contribute/${inviteToken}/questions-review`);
          return;
        }

        setCurrentIndex(resumeIndex);
        setStep(hasAnyAnswer(restoredAnswers) ? "question" : "intro");

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
    [inviteToken],
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

    setAnswerError("");
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: nextAnswer,
    }));
    storeQuestionnaireDraft(inviteToken, draft?.session?.contributorId, {
      ...answersRef.current,
      [questionId]: nextAnswer,
    });
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
    storeQuestionnaireDraft(inviteToken, draft?.session?.contributorId, {
      ...answersRef.current,
      [questionId]: nextAnswer,
    });

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
      storeQuestionnaireDraft(inviteToken, draft?.session?.contributorId, {
        ...answersRef.current,
        [questionId]: nextAnswer,
      });
      queueSave(questionId, nextAnswer, 1200);
    },
    [draft?.session?.contributorId, inviteToken, queueSave],
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

  const moveToQuestion = async (nextIndex, { requireCurrentAnswer = true } = {}) => {
    if (nextIndex < 0) {
      setStep("intro");
      return;
    }

    if (nextIndex >= CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.length) {
      return;
    }

    const answerSnapshot = answersRef.current[currentQuestion.id] ?? createEmptyAnswer();
    if (requireCurrentAnswer && !String(answerSnapshot.answer_text || "").trim()) {
      setAnswerError("Please answer this question before continuing.");
      return;
    }

    setIsNavigating(true);
    stopListening();
    window.clearTimeout(saveTimerRef.current);
    const didSave = await saveAnswer(
      currentQuestion.id,
      answerSnapshot,
      { force: true },
    );
    if (!didSave) {
      setIsNavigating(false);
      return;
    }
    setAnswerError("");
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
    const answerSnapshot = answersRef.current[currentQuestion.id] ?? createEmptyAnswer();
    if (!String(answerSnapshot.answer_text || "").trim()) {
      setAnswerError("Please answer this question before continuing.");
      setIsNavigating(false);
      return;
    }
    const didSave = await saveAnswer(
      currentQuestion.id,
      answerSnapshot,
      { force: true },
    );
    if (!didSave) {
      setIsNavigating(false);
      return;
    }
    router.push(`/contribute/${inviteToken}/questions-review`);
  };

  const handleBack = () => {
    if (step === "intro") {
      router.push(`/contribute/${inviteToken}/relationship`);
      return;
    }

    if (currentIndex === 0) {
      setStep("intro");
      return;
    }

    moveToQuestion(currentIndex - 1, { requireCurrentAnswer: false });
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

  const subjectName = draft.invite?.deceased?.name || "them";
  const personalizedQuestion = {
    ...currentQuestion,
    prompt: formatQuestionPrompt(currentQuestion.prompt, draft.invite?.deceased?.name),
  };

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">
      <ContributorNav onBack={handleBack} />

      <div className="flex-1 px-6 sm:px-[50px] pt-6 pb-16">
        <div className="page-shell-wide flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-10">

          {step === "intro" ? (
            <section className="flex flex-col items-center gap-8 text-center">
              <div className="max-w-[640px]">
                <h1 className="text-h1 text-r-text">Who is {subjectName} to you?</h1>
                <p className="mt-2 text-body-2 text-r-secondary">
                  Answer the following questions to help us know who {subjectName} was as a person from your eyes.
                </p>
              </div>

              <MemoryOrb className="h-44 w-44 sm:h-56 sm:w-56" />

              <button
                type="button"
                onClick={() => setStep("question")}
                className="mx-auto w-full max-w-[400px] rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 bg-r-btn text-r-btn-text border-none"
              >
                Continue
              </button>
            </section>
          ) : (
            <div className="flex w-full flex-col items-center gap-8">
              <QuestionCard
                question={personalizedQuestion}
                answerText={currentAnswer.answer_text}
                inputMode={currentAnswer.input_mode}
                autosaveStatus={autosaveStatus}
                isListening={isListening}
                speechSupported={speechSupported}
                error={answerError}
                onAnswerChange={handleAnswerChange}
                onAnswerBlur={handleAnswerBlur}
                onModeChange={handleModeChange}
                onToggleListening={handleToggleListening}
              />

              <button
                type="button"
                onClick={handleContinue}
                disabled={isNavigating}
                className="mx-auto w-full max-w-[400px] rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-55 bg-r-btn text-r-btn-text border-none"
              >
                {isNavigating ? "Saving..." : "Continue"}
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

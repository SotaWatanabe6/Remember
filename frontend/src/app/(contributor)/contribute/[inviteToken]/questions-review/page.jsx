'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/questions-review/page.jsx

import { useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { saveResponses } from '@/lib/api.js';
import { getQuestionSetForContributorRelationship } from '@/lib/contribute/questionnaireQuestions.js';

function ContributorNav({ backHref }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 sm:px-[50px] py-6">
      <div className="flex items-center gap-2">
        <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
        <span className="text-r-text text-2xl leading-8 font-display">Remember</span>
      </div>
      <Link href={backHref} className="flex items-center gap-2 text-r-text transition-opacity hover:opacity-70">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z" fill="currentColor"/>
        </svg>
        <span className="text-base font-normal">Back</span>
      </Link>
    </nav>
  );
}

function EditableAnswerCard({ question, answer, questionId, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(answer);
  const [error, setError] = useState('');

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Questionnaire answers are required.');
      return;
    }

    setEditing(false);
    setError('');
    if (trimmed !== answer) await onEdit(questionId, question, trimmed);
  }

  return (
    <div className="rounded-2xl p-6" style={{ border: '1px solid var(--color-r-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-body-1 text-r-text">{question}</p>
        <button onClick={() => setEditing(!editing)}
          className="shrink-0 p-1 transition-opacity hover:opacity-60 text-r-text" aria-label="Edit answer">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
          </svg>
        </button>
      </div>
      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <textarea autoFocus value={value} onChange={(e) => setValue(e.target.value)} rows={4}
            required
            aria-invalid={Boolean(error)}
            className="w-full rounded-xl px-4 py-3 text-body-2 text-r-text bg-transparent focus:outline-none resize-none"
            style={{ border: '1px solid var(--color-r-border-focus)' }} />
          {error ? <p className="text-sm leading-5 text-r-danger">{error}</p> : null}
          <div className="flex gap-2">
            <button onClick={() => { setValue(answer); setEditing(false); }}
              className="rounded-full px-4 py-2 text-caption text-r-secondary bg-transparent transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--color-r-border)' }}>Cancel</button>
            <button onClick={handleSave}
              className="rounded-full px-4 py-2 text-caption font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none">Save</button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-body-2 text-r-secondary" style={{ lineHeight: 1.6 }}>
          {value || <span className="text-r-muted italic">No answer provided.</span>}
        </p>
      )}
    </div>
  );
}

function readQuestionnaireReviewDraft(inviteToken) {
  if (typeof window === 'undefined') {
    return { session: null, questions: [], responses: [] };
  }

  try {
    const session = JSON.parse(localStorage.getItem(`remember_contributor_session:${inviteToken}`) || '{}');
    const contributorId = session?.contributorId;
    const questions = getQuestionSetForContributorRelationship(
      session?.relationship_type,
      session?.relationship_custom_label ?? session?.relationship_label,
    );
    if (!contributorId) return { session, questions, responses: [] };

    const allResponses = JSON.parse(localStorage.getItem(`remember_questionnaire_responses:${inviteToken}`) || '{}');
    const mine = allResponses[contributorId] ?? {};
    const responses = questions.map((question, index) => {
      const saved = mine[question.id] || Object.values(mine).find((response) => (
        response.question_id
          ? response.question_id === question.id
          : response.question_text === question.prompt ||
            response.question_order === index + 1 ||
            response.order_index === index + 1
      ));
      return {
        ...(saved || {}),
        question_id: question.id,
        question_text: saved?.question_text || question.prompt,
        question_order: index + 1,
        order_index: index + 1,
        response_text: saved?.response_text || saved?.answer_text || '',
        answer_text: saved?.answer_text || saved?.response_text || '',
      };
    });

    return { session, questions, responses };
  } catch {
    return { session: null, questions: [], responses: [] };
  }
}

export default function QuestionsReviewPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [initialDraft] = useState(() => readQuestionnaireReviewDraft(inviteToken));
  const [responses, setResponses] = useState(() => initialDraft.responses);
  const [continueError, setContinueError] = useState('');
  const sessionRef = useRef(initialDraft.session);
  const questionsRef = useRef(initialDraft.questions);

  async function handleEdit(questionId, questionText, newAnswer) {
    const questionIndex = questionsRef.current.findIndex((question) => question.id === questionId);
    const session = sessionRef.current;
    const sessionContributorId = session?.contributorId;
    const sessionContributorToken = session?.contributorToken || session?.contributorId;
    setContinueError('');
    setResponses((prev) => prev.map((r) =>
      (r.question_id === questionId || r.question_text === questionText)
        ? { ...r, response_text: newAnswer, answer_text: newAnswer } : r
    ));
    let updatedEntry = {
      contributor_id: sessionContributorId,
      contributor_token: sessionContributorToken,
      question_id: questionId,
      question_text: questionText,
      question_order: questionIndex + 1,
      order_index: questionIndex + 1,
      response_text: newAnswer,
      answer_text: newAnswer,
    };
    try {
      if (sessionContributorId) {
        const responsesKey = `remember_questionnaire_responses:${inviteToken}`;
        const allResponses = JSON.parse(localStorage.getItem(responsesKey) || '{}');
        const mine = allResponses[sessionContributorId] ?? {};
        const entryKey = Object.keys(mine).find((k) =>
          mine[k].question_id === questionId || mine[k].question_text === questionText
        );
        if (entryKey) {
          mine[entryKey] = { ...mine[entryKey], response_text: newAnswer, answer_text: newAnswer };
          updatedEntry = mine[entryKey];
        } else {
          mine[questionId] = updatedEntry;
          updatedEntry = mine[questionId];
        }
        allResponses[sessionContributorId] = mine;
        localStorage.setItem(responsesKey, JSON.stringify(allResponses));
      }
    } catch {}
    if (updatedEntry) {
      try { await saveResponses(inviteToken, [updatedEntry], { contributorToken: sessionContributorToken }); } catch {}
    }
  }

  function handleContinue() {
    const firstMissingIndex = responses.findIndex((response) => (
      !String(response.response_text || response.answer_text || '').trim()
    ));

    if (firstMissingIndex >= 0) {
      setContinueError('Please answer every questionnaire question before continuing.');
      return;
    }

    router.push(`/contribute/${inviteToken}/upload`);
  }

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">
      <ContributorNav backHref={`/contribute/${inviteToken}/questions`} />

      <div className="flex-1 px-6 sm:px-[50px] pt-6 pb-16">
        <div className="mx-auto flex w-full max-w-[887px] flex-col gap-6">

          <h1 className="text-h1 text-r-text text-center pt-2">Review answers</h1>

          {responses.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ border: '1px solid var(--color-r-border)' }}>
              <p className="text-body-2 text-r-muted">No answers saved yet.</p>
              <button onClick={() => router.push(`/contribute/${inviteToken}/questions`)}
                className="mt-4 rounded-full px-6 py-2.5 text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none">
                Go to questions
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {responses.map((r) => (
                <EditableAnswerCard
                  key={r.question_id ?? r.question_text}
                  questionId={r.question_id ?? r.question_text}
                  question={r.question_text || r.question_id}
                  answer={r.response_text || r.answer_text || ''}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}

          {continueError ? (
            <p className="rounded-2xl px-4 py-3 text-center text-caption" style={{ backgroundColor: '#F5DDD6', color: 'var(--color-r-danger)' }} role="alert">
              {continueError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => router.push(`/contribute/${inviteToken}/questions`)}
              className="flex h-[56px] items-center justify-center rounded-full text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
            >
              Start over
            </button>
            <button onClick={handleContinue}
              className="flex h-[56px] items-center justify-center rounded-full text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none">
              Continue
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}

// frontend/src/app/(contributor)/contribute/[inviteToken]/questions-review/page.jsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { saveResponses } from '@/lib/api.js';

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between pt-2 sm:pt-4">
      <span className="text-r-text text-2xl leading-8">Remember</span>
      <Link href={backHref} className="flex items-center gap-1.5 text-body-2 text-r-secondary transition-colors">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

function EditableAnswerCard({ question, answer, questionId, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(answer);

  async function handleSave() {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed !== answer) await onEdit(questionId, question, trimmed);
  }

  return (
    <div className="rounded-2xl p-6" style={{ border: '1px solid var(--color-r-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-body-1 text-r-text" style={{ fontStyle: 'italic' }}>{question}</p>
        <button
          onClick={() => setEditing(!editing)}
          className="shrink-0 p-1 transition-opacity hover:opacity-60 text-r-muted"
          aria-label="Edit answer"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
          </svg>
        </button>
      </div>
      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-body-2 text-r-text bg-transparent focus:outline-none resize-none"
            style={{ border: '1px solid var(--color-r-border-focus)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setValue(answer); setEditing(false); }}
              className="rounded-full px-4 py-2 text-caption text-r-secondary bg-transparent transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--color-r-border)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-full px-4 py-2 text-caption font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
            >
              Save
            </button>
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

export default function QuestionsReviewPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    try {
      const sessionKey = `remember_contributor_session:${inviteToken}`;
      const session = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      const contributorId = session?.contributorId;
      if (!contributorId) return;

      const responsesKey = `remember_questionnaire_responses:${inviteToken}`;
      const allResponses = JSON.parse(localStorage.getItem(responsesKey) || '{}');
      const mine = allResponses[contributorId] ?? {};
      const sorted = Object.values(mine)
        .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
        .filter((r) => r.question_text || r.question_id);
      setResponses(sorted);
    } catch {}
  }, [inviteToken]);

  async function handleEdit(questionId, questionText, newAnswer) {
    // Update React state
    setResponses((prev) => prev.map((r) =>
      (r.question_id === questionId || r.question_text === questionText)
        ? { ...r, response_text: newAnswer, answer_text: newAnswer }
        : r
    ));

    // Update localStorage
    let updatedEntry = null;
    try {
      const sessionKey = `remember_contributor_session:${inviteToken}`;
      const session = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      const contributorId = session?.contributorId;
      if (contributorId) {
        const responsesKey = `remember_questionnaire_responses:${inviteToken}`;
        const allResponses = JSON.parse(localStorage.getItem(responsesKey) || '{}');
        const mine = allResponses[contributorId] ?? {};
        const entryKey = Object.keys(mine).find((k) =>
          mine[k].question_id === questionId || mine[k].question_text === questionText
        );
        if (entryKey) {
          mine[entryKey] = { ...mine[entryKey], response_text: newAnswer, answer_text: newAnswer };
          allResponses[contributorId] = mine;
          localStorage.setItem(responsesKey, JSON.stringify(allResponses));
          updatedEntry = mine[entryKey];
        }
      }
    } catch {}

    // Persist to backend — non-blocking
    if (updatedEntry) {
      try {
        await saveResponses(inviteToken, [updatedEntry], {
          contributorToken: updatedEntry.contributor_id,
        });
      } catch {}
    }
  }

  function handleStartOver() {
    router.push(`/contribute/${inviteToken}/questions`);
  }

  function handleContinue() {
    router.push(`/contribute/${inviteToken}/upload`);
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6">

        <ContributorNav backHref={`/contribute/${inviteToken}/questions`} />

        <h1 className="text-h1 text-r-text text-center pt-2">Review answers</h1>

        {responses.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ border: '1px solid var(--color-r-border)' }}>
            <p className="text-body-2 text-r-muted">No answers saved yet.</p>
            <button
              onClick={handleStartOver}
              className="mt-4 rounded-full px-6 py-2.5 text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
            >
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

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={handleStartOver}
            className="flex h-[56px] items-center justify-center rounded-full text-body-2 font-medium transition-colors text-r-text bg-transparent"
            style={{ border: '1px solid var(--color-r-border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-r-card)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Start over
          </button>
          <button
            onClick={handleContinue}
            className="flex h-[56px] items-center justify-center rounded-full text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
          >
            Continue
          </button>
        </div>

      </div>
    </main>
  );
}
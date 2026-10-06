"use client";

import { useState } from "react";
import Image from "next/image";

function ReviewItem({ item, type, disabled, onResolve }) {
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(item.response_text || "");
  const [question, setQuestion] = useState(item.question_text || "");
  const resolve = (decision) => onResolve({ type, item_id: item.id, decision,
    ...(decision === "edited" ? { response_text: answer, question_text: question } : {}) });
  return (
    <article className="rounded-xl border border-[#C96E43] p-5">
      <p className="font-medium">{type === "contribution" ? "Whole contribution" : type === "responses" ? item.question_text : item.file_name || "Uploaded content"}</p>
      <p className="mt-2 text-sm text-r-secondary">{item.flagged_reason || "This content needs your review before generation."}</p>
      {type === "responses" && <p className="mt-3 whitespace-pre-wrap">{item.response_text}</p>}
      {type === "photos" && item.photo_url && <Image src={item.photo_url} unoptimized width={640} height={480} alt={item.caption || "Photo awaiting review"} className="mt-3 h-auto max-h-60 w-auto rounded-lg object-contain" />}
      {type === "voices" && item.audio_url && <audio controls src={item.audio_url} className="mt-3" />}
      {editing && (
        <div className="mt-4 flex flex-col gap-3">
          <label>Question <textarea value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000} className="block w-full rounded border p-2" /></label>
          <label>Answer <textarea value={answer} onChange={e => setAnswer(e.target.value)} maxLength={20000} className="block min-h-28 w-full rounded border p-2" /></label>
          <p className="text-sm text-r-secondary">Change the question to move this answer to the correct prompt. Saving approves the edited answer.</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-4">
        <button type="button" disabled={disabled || (editing && (!answer.trim() || !question.trim()))} onClick={() => resolve(editing ? "edited" : "approved")} className="rounded-full bg-r-btn px-4 py-2 text-r-btn-text disabled:opacity-40">{editing ? "Save and approve" : "Approve as-is"}</button>
        {type === "responses" && <button type="button" disabled={disabled} onClick={() => setEditing(!editing)}>{editing ? "Cancel edit" : "Edit or move answer"}</button>}
        <button type="button" disabled={disabled} onClick={() => resolve("excluded")}>Leave out of memorial</button>
      </div>
    </article>
  );
}

export function getModerationReviewItems(detail) {
  const sections = { contribution: detail?.contributor ? [detail.contributor] : [], photos: detail?.photos || [], responses: detail?.responses || [], voices: detail?.voices || [] };
  if (detail?.contributor?.moderation_resolution === "excluded") return [];
  return Object.entries(sections).flatMap(([type, items]) => items.filter(item => item.is_flagged && !item.moderation_resolution).map(item => ({ type, item })));
}

export default function ModerationReview({ detail, disabled, onResolve }) {
  const items = getModerationReviewItems(detail);
  if (!items.length) return null;
  return (
    <section aria-label="Flagged content review" className="flex flex-col gap-4">
      <h3 className="text-2xl">Review flagged content</h3>
      <p>Generation is paused until you resolve these concerns. Leaving content out keeps the original submission saved.</p>
      {items.map(({ type, item }) => <ReviewItem key={`${type}-${item.id}`} item={item} type={type} disabled={disabled} onResolve={onResolve} />)}
    </section>
  );
}

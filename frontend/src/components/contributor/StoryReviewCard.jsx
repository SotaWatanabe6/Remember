'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function StoryReviewCard({ story, disabled, editing, saving, onEdit, onCancel, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const displayTitle = story.title || 'Untitled story';

  return (
    <article aria-label={displayTitle} className="rounded-[20px] border border-r-border p-5 sm:p-[30px]">
      {editing ? (
        <form onSubmit={async (event) => {
          event.preventDefault();
          if (!disabled && (title.trim() || body.trim())) await onSave({ title, body });
        }} onKeyDown={(event) => { if (event.key === 'Escape' && !disabled) onCancel(); }}>
          <label htmlFor={`story-title-${story.id}`} className="text-body-2 text-r-text">Story title</label>
          <input id={`story-title-${story.id}`} autoFocus value={title} disabled={disabled}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-r-border bg-transparent px-5 py-3 text-body-2 focus:outline-2 focus:outline-r-text" />
          <label htmlFor={`story-body-${story.id}`} className="mt-5 block text-body-2 text-r-text">Story text</label>
          <textarea id={`story-body-${story.id}`} rows={8} value={body} disabled={disabled}
            onChange={(event) => setBody(event.target.value)}
            className="mt-2 w-full resize-y rounded-2xl border border-r-border bg-transparent px-5 py-3 text-body-2 leading-7 focus:outline-2 focus:outline-r-text" />
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={disabled || (!title.trim() && !body.trim())}
              className="rounded-full bg-r-btn px-6 py-3 text-r-btn-text disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" disabled={disabled} onClick={onCancel} className="rounded-full border border-r-border px-6 py-3 disabled:opacity-40">Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <h3 className="min-w-0 break-words text-[24px] leading-8 [font-family:var(--font-family-display)]">{displayTitle}</h3>
            <div className="flex shrink-0 gap-2">
              <button type="button" disabled={disabled} aria-label={`Edit story ${displayTitle}`}
                onClick={() => { setTitle(story.title || ''); setBody(story.body || ''); onEdit(); }}
                className="p-1 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4">
                <Image src="/icons/review-edit.svg" width={24} height={24} alt="" />
              </button>
              <button type="button" disabled={disabled} onClick={onDelete} aria-label={`Delete story ${displayTitle}`}
                className="p-1 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4">
                <Image src="/icons/review-trash.svg" width={24} height={24} alt="" />
              </button>
            </div>
          </div>
          {story.body && <p className="mt-5 whitespace-pre-wrap break-words text-[20px] leading-7 text-r-secondary">{story.body}</p>}
        </>
      )}
    </article>
  );
}

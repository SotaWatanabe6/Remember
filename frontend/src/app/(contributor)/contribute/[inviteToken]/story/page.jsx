'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getContributorStories, saveContributorStory } from '@/lib/api.js';
import ContributorUploadNav from '@/components/contributor/ContributorUploadNav';
import { useContributorSubjectName } from '@/lib/contribute/useContributorSubjectName';

const STORY_TITLE_SUGGESTIONS = [
  'Our first time meeting',
  'A day I will never forget',
  'The kindness they always showed',
  'A memory that makes me smile',
  'What they taught me',
];

function useSpeechToText({ onFinalTranscript, onInterimTranscript }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  function toggle() {
    if (recognitionRef.current) {
      // Wait for onend so the final transcript arrives before saving is enabled.
      recognitionRef.current.stop();
      return;
    }
    setError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice typing is unavailable in this browser. You can type your story below.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interimText += event.results[i][0].transcript;
      }
      if (finalText) onFinalTranscript(finalText);
      onInterimTranscript(interimText);
    };
    recognition.onerror = () => setError('Voice typing stopped. You can keep typing or try the microphone again.');
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      onInterimTranscript('');
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setError('Could not start voice typing. You can type your story below.');
    }
  }

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      recognition.abort();
    }
  }, []);

  return { listening, error, toggle };
}

export default function StoryPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const subjectName = useContributorSubjectName(inviteToken);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [interimText, setInterimText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const storyIdRef = useRef(null);
  const mutationRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await getContributorStories(inviteToken);
        if (!active) return;
        if (data.contributor?.status !== 'in_progress' || data.contributor?.submitted_at) {
          router.replace(`/contribute/${inviteToken}/submitted`);
          return;
        }
        setStories(data.stories);
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Could not load your stories. Please try again.');
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [inviteToken, reload, router]);

  const { listening, error: speechError, toggle: toggleMic } = useSpeechToText({
    onFinalTranscript: (text) => setBody((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text),
    onInterimTranscript: setInterimText,
  });
  const disabled = loading || Boolean(loadError) || saving || locked;
  const hasDraft = Boolean(title.trim() || body.trim());

  async function saveStory(continueToReview) {
    if (mutationRef.current || disabled || listening) return;
    mutationRef.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (hasDraft) {
        const session = JSON.parse(localStorage.getItem(`remember_contributor_session:${inviteToken}`) || '{}');
        const contributorToken = session?.contributorToken || session?.contributorId;
        // Retain this ID after a failed request so retrying cannot duplicate a story.
        storyIdRef.current ||= `story-${crypto.randomUUID()}`;
        const { story } = await saveContributorStory(inviteToken, contributorToken, {
          id: storyIdRef.current, title: title.trim(), body: body.trim(), created_at: new Date().toISOString(),
        });
        setStories((items) => [...items.filter((item) => item.id !== story.id), story]);
        setTitle('');
        setBody('');
        storyIdRef.current = null;
        setShowSuggestions(false);
        setNotice('Story added. You can add another story or continue.');
      }
      if (continueToReview) router.push(`/contribute/${inviteToken}/review?tab=stories`);
    } catch (err) {
      if (err?.status === 403) setLocked(true);
      setError(err instanceof Error ? err.message : 'Could not save your story. Please try again.');
    } finally {
      mutationRef.current = false;
      setSaving(false);
    }
  }

  const displayedBody = listening && interimText ? `${body}${body ? ' ' : ''}${interimText}` : body;

  return (
    <main className="flex min-h-screen flex-col bg-r-bg text-r-text">
      <ContributorUploadNav backHref={`/contribute/${inviteToken}/upload`} disabled={saving || listening} />
      <div className="flex flex-1 flex-col items-center gap-12 px-6 pb-[50px] pt-10 sm:gap-[100px] sm:px-[50px] sm:pt-[50px]">
        <header className="text-center">
          <h1 className="text-h1">Upload your memories</h1>
          <p className="mt-5 text-[20px] leading-[26px] text-r-secondary">Tell us a story{subjectName ? ` about ${subjectName}` : ''}.</p>
        </header>

        <div className="flex w-full max-w-[887px] flex-col gap-[30px]">
          {loading && <p role="status">Loading your stories…</p>}
          {loadError && <div role="alert" className="rounded-[20px] border border-r-muted p-6">
            <p className="text-r-danger">{loadError}</p>
            <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-4 underline">Try again</button>
          </div>}

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="story-title" className="text-[24px] leading-8 [font-family:var(--font-family-display)]">Story title</label>
              <button type="button" disabled={disabled} aria-expanded={showSuggestions} aria-controls="story-suggestions"
                onClick={() => setShowSuggestions((value) => !value)}
                className="flex items-center gap-2 text-sm hover:opacity-70 disabled:opacity-50">
                <Image src="/icons/story-suggestions.svg" width={23} height={22} alt="" />
                Need suggestions?
              </button>
            </div>
            {showSuggestions && <div id="story-suggestions" className="overflow-hidden rounded-[13px] border border-r-muted">
              {STORY_TITLE_SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" disabled={disabled}
                onClick={() => { setTitle(suggestion); setShowSuggestions(false); }}
                className="block w-full px-5 py-3 text-left hover:bg-r-card focus-visible:bg-r-card">{suggestion}</button>)}
            </div>}
            <input id="story-title" type="text" value={title} disabled={disabled}
              onChange={(event) => { setTitle(event.target.value); setError(''); }} placeholder="Our first time meeting"
              className="h-[63px] w-full rounded-[13px] border border-r-muted bg-transparent px-5 text-[20px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-text disabled:opacity-50" />
            <div className="flex min-h-[250px] items-start gap-3 rounded-[13px] border border-r-muted p-5 focus-within:ring-1 focus-within:ring-r-text sm:gap-5">
              <button type="button" onClick={toggleMic} disabled={disabled} aria-pressed={listening}
                aria-label={listening ? 'Stop voice typing' : 'Start voice typing'}
                className="flex size-10 shrink-0 items-center justify-center rounded-full hover:opacity-70 focus-visible:outline-2 disabled:opacity-50">
                {listening ? <span className="size-5 rounded-sm bg-r-danger" /> : <Image src="/icons/story-record.svg" width={40} height={40} alt="" />}
              </button>
              <label htmlFor="story-body" className="sr-only">Your story</label>
              <textarea id="story-body" value={displayedBody} disabled={disabled} readOnly={listening}
                onChange={(event) => { setBody(event.target.value); setError(''); }} placeholder="Write your memory here…"
                className="min-h-[208px] min-w-0 flex-1 resize-y bg-transparent text-[20px] leading-[26px] outline-none disabled:opacity-50" />
            </div>
            {listening && <p role="status" className="text-r-secondary">Listening… Stop voice typing before adding your story.</p>}
            {speechError && <p role="status" className="text-r-secondary">{speechError}</p>}
            {error && <p role="alert" className="text-r-danger">{error}</p>}
            {locked && <Link href={`/contribute/${inviteToken}/submitted`} className="underline">Return to your submission</Link>}
            <button type="button" onClick={() => saveStory(false)} disabled={disabled || listening || !hasDraft}
              className="self-end rounded-full border border-r-muted px-8 py-3 text-r-secondary hover:bg-r-card disabled:opacity-50">{saving ? 'Saving…' : 'Add story'}</button>
            <p role="status" className="text-r-secondary">{notice}</p>
          </div>

          <section aria-labelledby="uploaded-stories" className="flex flex-col gap-5">
            <h2 id="uploaded-stories" className="text-[24px] leading-8 [font-family:var(--font-family-display)]">Uploaded stories</h2>
            {stories.map((story) => <article key={story.id} className="min-w-0 rounded-[20px] border border-r-muted p-6 sm:p-[30px]">
              <h3 className="break-words text-[24px] leading-8 [font-family:var(--font-family-display)]">{story.title || 'Untitled story'}</h3>
              <p className="mt-5 whitespace-pre-wrap break-words text-[20px] leading-[26px] text-r-secondary">{story.body}</p>
            </article>)}
            {!loading && !loadError && stories.length === 0 && <p className="text-r-secondary">No stories added yet. Add a story above or continue when you’re ready.</p>}
          </section>
        </div>

        <button type="button" onClick={() => saveStory(true)} disabled={disabled || listening}
          className="h-[62px] w-full max-w-[434px] rounded-full bg-r-btn px-8 text-body-2 text-r-btn-text hover:opacity-80 disabled:opacity-50">
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </main>
  );
}

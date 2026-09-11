'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/review/page.jsx

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { deletePhoto, deleteVoice, getContributorSummary, saveContributorStory, submitContribution } from '@/lib/api.js';
import PhotoReviewGrid from '@/components/contributor/PhotoReviewGrid';
import HeaderBrand from '@/components/ui-components/navs/header-brand';

function ContributorNav({ backHref }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-6 sm:p-[50px]">
      <HeaderBrand />
      <Link href={backHref} className="flex items-center gap-2 text-r-text transition-opacity hover:opacity-70">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z" fill="currentColor"/>
        </svg>
        <span className="text-base font-normal">Back</span>
      </Link>
    </nav>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl p-6" style={{ border: '1px solid var(--color-r-border)' }}>
      <p className="text-h3 text-r-text mb-4">{title}</p>
      {children}
    </div>
  );
}

function AudioRow({ recording, onDelete, onEditTitle }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(recording.contributor_title || '');
  const hasPreview = Boolean(recording.audio_url || recording.previewUrl);

  async function togglePlay() {
    if (!audioRef.current || !hasPreview) return;
    if (playing) { audioRef.current.pause(); return; }
    try { await audioRef.current.play(); } catch { setPlaying(false); }
  }

  function commitTitle() {
    const t = title.trim();
    setEditingTitle(false);
    if (t && t !== recording.contributor_title) onEditTitle?.(recording.id, t);
    if (!t) setTitle(recording.contributor_title || '');
  }

  function formatDuration(s) {
    if (!s) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  return (
    <div className="flex items-center gap-4">
      <button onClick={togglePlay} disabled={!hasPreview}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-r-text)', color: 'white' }}
        aria-label={playing ? 'Pause' : 'Play'}>
        {playing
          ? <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          : <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
      </button>
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            className="w-full rounded px-2 py-0.5 text-sm focus:outline-none text-r-text bg-r-modal"
            style={{ border: '1px solid var(--color-r-border-focus)' }} />
        ) : (
          <p className="truncate text-body-2 font-medium text-r-text">{title || recording.contributor_title}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative h-1 flex-1 rounded-full bg-r-border">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: 'var(--color-r-text)' }} />
          </div>
          <span className="shrink-0 text-caption text-r-muted">{formatDuration(recording.duration_seconds)}</span>
        </div>
        <p className="text-caption text-r-muted">{recording.file_name}</p>
        {(recording.audio_url || recording.previewUrl) && (
          <audio ref={audioRef} src={recording.audio_url || recording.previewUrl} preload="metadata"
            onTimeUpdate={() => { if (!audioRef.current) return; setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0); }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setProgress(0); }} />
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setEditingTitle(true)} className="p-1.5 text-r-muted transition-opacity hover:opacity-70" aria-label="Edit title">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" /></svg>
        </button>
        <button onClick={() => onDelete(recording.id)} className="p-1.5 text-r-danger transition-opacity hover:opacity-70" aria-label="Delete recording">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [photos, setPhotos] = useState([]);
  const [voice, setVoice] = useState([]);
  const [stories, setStories] = useState([]);
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [activeTab, setActiveTab] = useState('photos');
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [photoNotice, setPhotoNotice] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const mutationRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setLoadError('');
      try {
        const summary = await getContributorSummary(inviteToken, { requireFreshPhotos: true });
        if (!isMounted) return;
        if (summary.contributor.status !== 'in_progress' || summary.contributor.submitted_at) {
          router.replace(`/contribute/${inviteToken}/submitted`);
          return;
        }
        if (isMounted) {
          setPhotos(summary.photos || []);
          setVoice(summary.voice || []);
          setResponses(summary.responses || []);
        }
      } catch (error) {
        if (isMounted) setLoadError(error instanceof Error ? error.message : 'Could not load your photos. Please try again.');
      }
      try {
        const storiesRaw = localStorage.getItem(`remember_stories:${inviteToken}`);
        if (storiesRaw && isMounted) setStories(JSON.parse(storiesRaw));
      } catch {}
      if (isMounted) setIsLoading(false);
    }
    load();
    return () => { isMounted = false; };
  }, [inviteToken, reload, router]);

  async function handleDeletePhoto(id) {
    if (mutationRef.current || loadError || isLocked) return;
    mutationRef.current = true;
    setDeletingPhotoId(id);
    setSubmitError('');
    setPhotoNotice('');
    try {
      await deletePhoto(inviteToken, id);
      setPhotos((p) => p.filter((x) => x.id !== id));
      setPhotoNotice('Photo removed.');
    } catch (error) {
      if (error?.status === 403) setIsLocked(true);
      setSubmitError(error instanceof Error ? error.message : 'Could not remove that photo. Please try again.');
    } finally {
      mutationRef.current = false;
      setDeletingPhotoId(null);
    }
  }

  async function handleDeleteVoice(id) {
    try { await deleteVoice(inviteToken, id); setVoice((v) => v.filter((x) => x.id !== id)); }
    catch { setSubmitError('Could not remove that recording. Please try again.'); }
  }

  function handleEditVoiceTitle(id, newTitle) {
    setVoice((v) => v.map((r) => r.id === id ? { ...r, contributor_title: newTitle } : r));
    try {
      const stored = JSON.parse(localStorage.getItem(`remember_voice:${inviteToken}`) || '[]');
      localStorage.setItem(`remember_voice:${inviteToken}`, JSON.stringify(stored.map((r) => r.id === id ? { ...r, contributor_title: newTitle } : r)));
    } catch {}
  }

  async function handleSubmit() {
    if (mutationRef.current || isLoading || loadError || isLocked) return;
    mutationRef.current = true;
    setIsSubmitting(true); setSubmitError('');
    try {
      const session = JSON.parse(localStorage.getItem(`remember_contributor_session:${inviteToken}`) || '{}');
      const contributorToken = session?.contributorToken || session?.contributorId;
      if (!contributorToken) {
        throw new Error('Please enter your contributor profile information before submitting.');
      }

      await Promise.all(
        stories
          .filter((story) => String(story?.title || story?.body || '').trim())
          .map((story) => saveContributorStory(inviteToken, contributorToken, story)),
      );
      await submitContribution(inviteToken, contributorToken);
      router.push(`/contribute/${inviteToken}/submitted`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit. Please try again.');
      setIsSubmitting(false);
      mutationRef.current = false;
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-r-bg">
        <div className="size-10 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-r-border)', borderTopColor: 'var(--color-r-text)' }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">
      <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

      <div className="flex-1 px-6 pb-[50px] pt-10 sm:px-[50px] sm:pt-[50px]">
        <div className="mx-auto flex w-full max-w-[886px] flex-col">

          <div className="mb-12 text-center sm:mb-[100px]">
            <h1 className="text-h1 text-r-text">Review contributions</h1>
            <p className="mt-5 text-[20px] leading-[26px] text-r-secondary">Review all uploaded media.</p>
          </div>

          {loadError ? (
            <div className="rounded-[20px] border border-r-border p-8 text-center">
              <p role="alert" className="text-body-2 text-r-danger">{loadError}</p>
              <button type="button" onClick={() => setReload((value) => value + 1)}
                className="mt-5 rounded-full bg-r-btn px-8 py-3 text-r-btn-text">Try again</button>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Contribution types" className="mb-[30px] flex gap-3 sm:gap-5">
                {[['photos', 'Photos'], ['voice', 'Voice'], ['stories', 'Stories']].map(([id, label], index, tabs) => (
                  <button key={id} id={`review-tab-${id}`} type="button" role="tab"
                    aria-selected={activeTab === id} aria-controls={`review-panel-${id}`}
                    tabIndex={activeTab === id ? 0 : -1}
                    onClick={() => setActiveTab(id)}
                    onKeyDown={(event) => {
                      let next;
                      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
                      if (event.key === 'Home') next = 0;
                      if (event.key === 'End') next = tabs.length - 1;
                      if (next === undefined) return;
                      event.preventDefault();
                      setActiveTab(tabs[next][0]);
                      document.getElementById(`review-tab-${tabs[next][0]}`)?.focus();
                    }}
                    className={`h-[50px] min-w-0 flex-1 rounded-full border border-r-muted text-[24px] leading-8 [font-family:var(--font-family-display)] transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-text sm:max-w-[207px] ${activeTab === id ? 'bg-[var(--buttonstate2,#9e9384)] text-r-modal' : 'text-r-muted hover:bg-r-card'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div id="review-panel-photos" role="tabpanel" aria-labelledby="review-tab-photos" hidden={activeTab !== 'photos'}>
                <PhotoReviewGrid photos={photos} deletingPhotoId={deletingPhotoId}
                  disabled={Boolean(deletingPhotoId) || isSubmitting || isLocked} onDelete={handleDeletePhoto} />
              </div>
              <div id="review-panel-voice" role="tabpanel" aria-labelledby="review-tab-voice" hidden={activeTab !== 'voice'}>
                <SectionCard title="Uploaded audio">
                  {voice.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {voice.map((rec) => (
                        <AudioRow key={rec.id} recording={rec} onDelete={handleDeleteVoice} onEditTitle={handleEditVoiceTitle} />
                      ))}
              </div>
            ) : (
              <p className="text-caption text-r-muted">No voice recordings added. You can submit without audio.</p>
            )}
          </SectionCard>

              </div>
              <div id="review-panel-stories" role="tabpanel" aria-labelledby="review-tab-stories" hidden={activeTab !== 'stories'}>
                <SectionCard title="Your questionnaire answers">
                  {responses.length > 0 ? (
                    <div className="flex flex-col gap-8">
                      {responses.map((response) => (
                        <article key={response.question_id} className="min-w-0">
                          <h3 className="text-[20px] leading-7 text-r-text">{response.question_text}</h3>
                          <p className="mt-3 whitespace-pre-wrap break-words text-body-2 leading-7 text-r-secondary">
                            {response.response_text}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="text-body-2 text-r-secondary">No questionnaire answers added yet.</p>
                  )}
                </SectionCard>
                {stories.length > 0 ? (
                  <div className="mt-6">
                    <SectionCard title="Additional stories">
                      <div className="flex flex-col gap-4">
                        {stories.map((story) => (
                          <div key={story.id} className="flex flex-col gap-1">
                            <p className="text-body-2 font-medium text-r-text">{story.title}</p>
                            <p className="whitespace-pre-wrap break-words text-body-2 text-r-secondary">
                              {story.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                ) : null}
              </div>
            </>
          )}

          <p className="sr-only" role="status">{deletingPhotoId ? 'Removing photo…' : photoNotice}</p>
          {submitError && (
            <p className="mt-6 rounded-2xl px-4 py-3 text-center text-body-2" style={{ backgroundColor: '#F5DDD6', color: 'var(--color-r-danger)' }} role="alert">
              {submitError}
            </p>
          )}

          <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-[100px] sm:grid-cols-2">
            <Link href={`/contribute/${inviteToken}/upload`}
              aria-disabled={Boolean(deletingPhotoId) || isSubmitting || isLocked}
              onClick={(event) => { if (mutationRef.current || isLocked) event.preventDefault(); }}
              className="flex h-[62px] items-center justify-center rounded-full text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none">
              Upload more
            </Link>
            <button onClick={handleSubmit} disabled={isSubmitting || Boolean(deletingPhotoId) || Boolean(loadError) || isLocked}
              className="flex h-[62px] items-center justify-center rounded-full text-body-2 font-medium transition-opacity hover:opacity-80 disabled:opacity-50 bg-r-btn text-r-btn-text border-none">
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}

'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/review/page.jsx

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { deletePhoto, deleteVoice, deleteContributorStory, updateContributorStory, getContributorSummary, renameContributorVoice, saveContributorStory, submitContribution } from '@/lib/api.js';
import StoryReviewCard from '@/components/contributor/StoryReviewCard';
import VoiceReviewCard from '@/components/contributor/VoiceReviewCard';
import PhotoReviewGrid from '@/components/contributor/PhotoReviewGrid';
import HeaderBrand from '@/components/ui-components/navs/header-brand';

function ContributorNav({ backHref, disabled }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-6 sm:p-[50px]">
      <HeaderBrand />
      <Link href={backHref} aria-disabled={disabled} onClick={(event) => { if (disabled) event.preventDefault(); }} className="flex items-center gap-2 text-r-text transition-opacity hover:opacity-70">
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
  const [pendingAction, setPendingAction] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [notice, setNotice] = useState('');
  const busy = Boolean(deletingPhotoId) || Boolean(pendingAction) || isSubmitting;
  const controlsDisabled = busy || isLocked;

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setLoadError('');
      try {
        const summary = await getContributorSummary(inviteToken, { requireFreshContent: true });
        if (!isMounted) return;
        if (summary.contributor.status !== 'in_progress' || summary.contributor.submitted_at) {
          router.replace(`/contribute/${inviteToken}/submitted`);
          return;
        }
        if (isMounted) {
          setPhotos(summary.photos || []);
          setVoice(summary.voice || []);
          setResponses(summary.responses || []);
          setStories(summary.stories || []);
        }
      } catch (error) {
        if (isMounted) setLoadError(error instanceof Error ? error.message : 'Could not load your memories. Please try again.');
      }
      if (isMounted) setIsLoading(false);
    }
    load();
    return () => { isMounted = false; };
  }, [inviteToken, reload, router]);

  async function handleDeletePhoto(id) {
    if (mutationRef.current || editingKey || loadError || isLocked) return;
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

  async function runContentMutation(action, successMessage) {
    if (mutationRef.current || loadError || isLocked) return false;
    mutationRef.current = true;
    setPendingAction(successMessage);
    setSubmitError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      return true;
    } catch (error) {
      if (error?.status === 403) setIsLocked(true);
      setSubmitError(error instanceof Error ? error.message : 'Could not save your changes. Please try again.');
      return false;
    } finally {
      mutationRef.current = false;
      setPendingAction('');
    }
  }

  async function handleDeleteVoice(id) {
    if (editingKey) return;
    await runContentMutation(async () => {
      await deleteVoice(inviteToken, id);
      setVoice((items) => items.filter((item) => item.id !== id));
    }, 'Recording removed.');
  }

  async function handleEditVoiceTitle(id, title) {
    const saved = await runContentMutation(async () => {
      const recording = await renameContributorVoice(inviteToken, id, title);
      setVoice((items) => items.map((item) => item.id === id ? { ...item, ...recording } : item));
    }, 'Recording title saved.');
    if (saved) setEditingKey('');
  }

  async function handleEditStory(story, changes) {
    const saved = await runContentMutation(async () => {
      const updated = await updateContributorStory(inviteToken, story, changes);
      setStories((items) => items.map((item) => item.id === story.id ? updated : item));
    }, 'Story saved.');
    if (saved) setEditingKey('');
  }

  async function handleDeleteStory(story) {
    if (editingKey) return;
    await runContentMutation(async () => {
      await deleteContributorStory(inviteToken, story);
      setStories((items) => items.filter((item) => item.id !== story.id));
    }, 'Story removed.');
  }

  async function handleSubmit() {
    if (mutationRef.current || editingKey || isLoading || loadError || isLocked) return;
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
          .filter((story) => !story.server_id && String(story?.title || story?.body || '').trim())
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
      <ContributorNav backHref={`/contribute/${inviteToken}/upload`} disabled={controlsDisabled || Boolean(editingKey)} />

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
                    disabled={controlsDisabled || Boolean(editingKey && activeTab !== id)}
                    aria-selected={activeTab === id} aria-controls={`review-panel-${id}`}
                    tabIndex={activeTab === id ? 0 : -1}
                    onClick={() => setActiveTab(id)}
                    onKeyDown={(event) => {
                      if (editingKey || controlsDisabled) return;
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
                  disabled={controlsDisabled || Boolean(editingKey)} onDelete={handleDeletePhoto} />
              </div>
              <div id="review-panel-voice" role="tabpanel" aria-labelledby="review-tab-voice" hidden={activeTab !== 'voice'}>
                {voice.length > 0 ? (
                  <div className="flex flex-col gap-[30px]">
                    {voice.map((rec) => (
                      <VoiceReviewCard key={rec.id} recording={rec}
                        disabled={controlsDisabled || Boolean(editingKey && editingKey !== `voice:${rec.id}`)}
                        editing={editingKey === `voice:${rec.id}`} saving={Boolean(pendingAction)}
                        onEdit={() => { setEditingKey(`voice:${rec.id}`); setSubmitError(''); }}
                        onCancel={() => { setEditingKey(''); setSubmitError(''); }}
                        onSave={(title) => handleEditVoiceTitle(rec.id, title)}
                        onDelete={() => handleDeleteVoice(rec.id)} />
                    ))}
                  </div>
                ) : <SectionCard title="Uploaded audio"><p className="text-body-2 text-r-muted">No voice recordings added. You can submit without audio.</p></SectionCard>}
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
                <div className="mt-[30px]">
                  <h2 className="mb-5 text-h3 text-r-text">Additional stories</h2>
                  {stories.length > 0 ? (
                    <div className="flex flex-col gap-[30px]">
                      {stories.map((story) => (
                        <StoryReviewCard key={story.id} story={story}
                          disabled={controlsDisabled || Boolean(editingKey && editingKey !== `story:${story.id}`)}
                          editing={editingKey === `story:${story.id}`} saving={Boolean(pendingAction)}
                          onEdit={() => { setEditingKey(`story:${story.id}`); setSubmitError(''); }}
                          onCancel={() => { setEditingKey(''); setSubmitError(''); }}
                          onSave={(changes) => handleEditStory(story, changes)}
                          onDelete={() => handleDeleteStory(story)} />
                      ))}
                    </div>
                  ) : <p className="text-body-2 text-r-muted">No additional stories added. You can submit without an additional story.</p>}
                </div>
              </div>
            </>
          )}

          <p className="sr-only" role="status">{deletingPhotoId ? 'Removing photo…' : photoNotice}</p>
          <p className="sr-only" role="status">{pendingAction ? 'Saving changes…' : notice}</p>
          {editingKey && !isLocked && <p className="mt-5 text-body-2 text-r-secondary">Save or cancel your edit before submitting.</p>}
          {submitError && (
            <p className="mt-6 rounded-2xl px-4 py-3 text-center text-body-2" style={{ backgroundColor: '#F5DDD6', color: 'var(--color-r-danger)' }} role="alert">
              {submitError}
            </p>
          )}
          {isLocked && <Link href={`/contribute/${inviteToken}/submitted`} className="mt-4 text-center text-body-2 underline">Return to your submission</Link>}

          <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-[100px] sm:grid-cols-2">
            <Link href={`/contribute/${inviteToken}/upload`}
              aria-disabled={controlsDisabled || Boolean(editingKey)}
              onClick={(event) => { if (mutationRef.current || editingKey || isLocked) event.preventDefault(); }}
              className="flex h-[62px] items-center justify-center rounded-full text-body-2 font-medium transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none">
              Upload more
            </Link>
            <button onClick={handleSubmit} disabled={controlsDisabled || Boolean(editingKey) || Boolean(loadError)}
              className="flex h-[62px] items-center justify-center rounded-full text-body-2 font-medium transition-opacity hover:opacity-80 disabled:opacity-50 bg-r-btn text-r-btn-text border-none">
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}

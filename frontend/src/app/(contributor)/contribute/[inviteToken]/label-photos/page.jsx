'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CONTRIBUTOR_RELATIONSHIP_OPTIONS } from '@/lib/contribute/relationshipOptions.js';
import {
  formatRelationshipPhrase,
  normalizeRelationshipGuess,
} from '@/lib/contribute/normalizeRelationshipGuess.js';
import { FONT } from '@/lib/styles.js';
import { getContributorSummary, labelPhoto } from '@/lib/api.js';
import { validateContributorInvite } from '@/services/contributorService.js';

const PAGE_BG = '#F0EAE2';
const TEXT_COLOR = '#423F39';
const BUTTON_BG = '#423F39';

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span className="text-2xl leading-8" style={{ color: TEXT_COLOR, fontFamily: FONT }}>
        Remember
      </span>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-base transition-opacity hover:opacity-70"
        style={{ color: TEXT_COLOR, fontFamily: FONT }}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

function getPhotoIdentity(photo) {
  const identity = photo?.ai_labels?.identity;
  return identity && typeof identity === 'object' ? identity : null;
}

function getRelationshipGuess(photo) {
  const identity = getPhotoIdentity(photo);
  const confidence = Number(identity?.relationship_confidence);
  const minConfidence = 0.55;

  if (identity?.relationship_guess) {
    const normalized = normalizeRelationshipGuess(identity.relationship_guess, { confidence });
    if (normalized.label && normalized.confidence >= minConfidence) {
      return normalized.label;
    }
  }

  if (identity?.other_person?.relationship_guess) {
    const normalized = normalizeRelationshipGuess(identity.other_person.relationship_guess, {
      confidence: Number(identity.other_person.relationship_confidence) || confidence,
    });
    if (normalized.label && normalized.confidence >= minConfidence) {
      return normalized.label;
    }
  }

  return null;
}

function getRelationshipReasoning(photo) {
  const identity = getPhotoIdentity(photo);
  return (
    identity?.relationship_reasoning ||
    identity?.other_person?.relationship_reasoning ||
    null
  );
}

function getPromptHeadline(photo, subjectName) {
  const identity = getPhotoIdentity(photo);
  if (identity?.prompt_text) return identity.prompt_text;
  if (identity?.prompt_type === 'beside_deceased') {
    return `Who is beside ${subjectName}?`;
  }
  return `Who is in this photo with ${subjectName}?`;
}

function getPromptSubtext(photo, subjectName) {
  const identity = getPhotoIdentity(photo);
  if (identity?.prompt_type === 'beside_deceased') {
    return `We recognized ${subjectName} in this photo. Help us name the person next to them.`;
  }
  if (identity?.prompt_type === 'only_deceased') {
    return `This photo appears to show ${subjectName}.`;
  }
  if (identity?.reference_missing) {
    return `The organizer has not added a reference portrait yet, so please label who you see.`;
  }
  return `Help us understand how the people in this photo are connected to ${subjectName}.`;
}

function getInitialRelationship(photo) {
  const saved = photo?.people_labels?.[0]?.relationship;
  if (saved) return saved;
  return getRelationshipGuess(photo) || '';
}

function getInitialName(photo) {
  return photo?.people_labels?.[0]?.name || '';
}

export default function LabelPhotosPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [subjectName, setSubjectName] = useState('them');
  const [contributorToken, setContributorToken] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentPhoto = photos[currentIndex] ?? null;
  const photoIdentity = currentPhoto ? getPhotoIdentity(currentPhoto) : null;
  const relationshipGuess = currentPhoto ? getRelationshipGuess(currentPhoto) : null;
  const relationshipPhrase = relationshipGuess
    ? formatRelationshipPhrase(relationshipGuess)
    : null;
  const relationshipReasoning = currentPhoto ? getRelationshipReasoning(currentPhoto) : null;
  const promptHeadline = currentPhoto ? getPromptHeadline(currentPhoto, subjectName) : 'Who is in this photo?';
  const promptSubtext = currentPhoto ? getPromptSubtext(currentPhoto, subjectName) : '';
  const showQuickConfirm =
    !editing &&
    relationshipGuess &&
    (photoIdentity?.prompt_type === 'beside_deceased' || photoIdentity?.prompt_type === 'only_others');
  const isDeceasedOnly = photoIdentity?.prompt_type === 'only_deceased';
  const totalPhotos = photos.length;
  const isLastPhoto = currentIndex >= totalPhotos - 1;

  const resetFieldsForPhoto = useCallback((photo) => {
    setName(getInitialName(photo));
    setRelationship(getInitialRelationship(photo));
    setEditing(Boolean(photo?.people_labels?.length));
    setErrorMessage('');
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPhotos() {
      setLoading(true);
      try {
        const [summary, invite] = await Promise.all([
          getContributorSummary(inviteToken),
          validateContributorInvite(inviteToken),
        ]);
        if (!isMounted) return;

        const uploaded = summary.photos || [];
        const token = summary.contributor?.id || null;
        const deceasedName = invite?.deceased?.name;

        if (deceasedName) setSubjectName(deceasedName);
        setContributorToken(token);

        if (!uploaded.length) {
          router.replace(`/contribute/${inviteToken}/voice`);
          return;
        }

        setPhotos(uploaded);
        resetFieldsForPhoto(uploaded[0]);
      } catch {
        if (isMounted) {
          setErrorMessage('We could not load your photos. Please go back and try again.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPhotos();
    return () => {
      isMounted = false;
    };
  }, [inviteToken, resetFieldsForPhoto, router]);

  useEffect(() => {
    if (currentPhoto) resetFieldsForPhoto(currentPhoto);
  }, [currentIndex, currentPhoto, resetFieldsForPhoto]);

  async function saveCurrentLabel(labels) {
    if (!currentPhoto || !contributorToken) return false;
    setSaving(true);
    setErrorMessage('');
    try {
      await labelPhoto(inviteToken, currentPhoto.id, labels, contributorToken);
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === currentPhoto.id ? { ...photo, people_labels: labels } : photo,
        ),
      );
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'We could not save this label. Please try again.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmGuess() {
    if (isDeceasedOnly) {
      const saved = await saveCurrentLabel([
        { name: subjectName, relationship: 'memorial_subject' },
      ]);
      if (saved) await goToNext();
      return;
    }
    if (!relationshipGuess) {
      setEditing(true);
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter their name — it appears on the relationship tree.');
      setEditing(true);
      return;
    }
    const saved = await saveCurrentLabel([
      { name: name.trim(), relationship: relationshipGuess },
    ]);
    if (saved) await goToNext();
  }

  async function handleSaveAndNext() {
    const trimmedName = name.trim();
    const trimmedRelationship = relationship.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter their name — it appears on the relationship tree.');
      return;
    }
    if (!trimmedRelationship) {
      setErrorMessage('Please enter how this person is related.');
      return;
    }
    const saved = await saveCurrentLabel([
      { name: trimmedName, relationship: trimmedRelationship },
    ]);
    if (saved) await goToNext();
  }

  async function goToNext() {
    if (isLastPhoto) {
      router.push(`/contribute/${inviteToken}/voice`);
      return;
    }
    setCurrentIndex((index) => index + 1);
  }

  async function handleSkipPhoto() {
    await goToNext();
  }

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{ backgroundColor: PAGE_BG, color: TEXT_COLOR, fontFamily: FONT }}
      >
        <p className="text-lg">Loading your photos...</p>
      </main>
    );
  }

  if (!currentPhoto) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{ backgroundColor: PAGE_BG, color: TEXT_COLOR, fontFamily: FONT }}
      >
        <p className="text-lg">{errorMessage || 'No photos to label.'}</p>
      </main>
    );
  }

  const previewSrc = currentPhoto.previewUrl || currentPhoto.url;

  return (
    <main
      className="min-h-screen px-6 py-10 sm:px-[50px]"
      style={{ backgroundColor: PAGE_BG, color: TEXT_COLOR, fontFamily: FONT }}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <ContributorNav backHref={`/contribute/${inviteToken}/photos`} />

        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] opacity-70">
            Photo {currentIndex + 1} of {totalPhotos}
          </p>
          <h1 className="mt-2 text-4xl font-medium leading-tight sm:text-5xl">
            {promptHeadline}
          </h1>
          <p className="mt-3 text-lg opacity-80">
            {promptSubtext}
          </p>
        </div>

        <article
          className="overflow-hidden rounded-2xl shadow-lg"
          style={{ backgroundColor: '#FFFCF8' }}
        >
          <div className="relative aspect-[4/5] w-full bg-[#D0C8C0]">
            {previewSrc ? (
              <Image
                src={previewSrc}
                alt={currentPhoto.file_name || 'Uploaded photo'}
                fill
                sizes="(min-width: 640px) 480px, 100vw"
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center opacity-70">
                {currentPhoto.file_name}
              </div>
            )}
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            {!editing && (showQuickConfirm || isDeceasedOnly) ? (
              <>
                <p className="text-2xl leading-snug">
                  {isDeceasedOnly ? (
                    <>
                      Does this photo show <span className="font-semibold italic">{subjectName}</span>?
                    </>
                  ) : relationshipPhrase ? (
                    <>
                      Is the person beside {subjectName}{' '}
                      <span className="font-semibold italic">{relationshipPhrase}</span>?
                    </>
                  ) : (
                    <>Who is the person beside {subjectName}?</>
                  )}
                </p>
                {relationshipReasoning ? (
                  <p className="text-base opacity-75">{relationshipReasoning}</p>
                ) : null}
                {photoIdentity?.other_person?.description ? (
                  <p className="text-base opacity-75">{photoIdentity.other_person.description}</p>
                ) : null}
                {!isDeceasedOnly ? (
                  <label className="block">
                    <span className="text-sm uppercase tracking-wide opacity-70">Their name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Maria"
                      required
                      className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-lg outline-none focus:ring-2"
                      style={{ borderColor: '#C8BEB4', color: TEXT_COLOR }}
                    />
                    <p className="mt-1 text-sm opacity-70">
                      This name appears on the constellation relationship tree.
                    </p>
                  </label>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleConfirmGuess}
                    disabled={saving}
                    className="flex-1 rounded-full px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: BUTTON_BG }}
                  >
                    Yes, that&apos;s right
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    disabled={saving}
                    className="flex-1 rounded-full border px-6 py-3 text-base font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ borderColor: BUTTON_BG, color: BUTTON_BG }}
                  >
                    Edit
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xl">
                  {relationshipGuess
                    ? `We think the person beside ${subjectName} may be ${formatRelationshipPhrase(relationshipGuess)}. Please confirm or correct.`
                    : `We couldn't tell their relationship from the photo alone — please tell us who is beside ${subjectName}.`}
                </p>
                <label className="block">
                  <span className="text-sm uppercase tracking-wide opacity-70">Their name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Ashwini"
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-lg outline-none focus:ring-2"
                    style={{ borderColor: '#C8BEB4', color: TEXT_COLOR }}
                  />
                </label>
                <label className="block">
                  <span className="text-sm uppercase tracking-wide opacity-70">Relationship</span>
                  <input
                    type="text"
                    list="relationship-suggestions"
                    value={relationship}
                    onChange={(event) => setRelationship(event.target.value)}
                    placeholder="e.g. daughter, friend, colleague"
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-lg outline-none focus:ring-2"
                    style={{ borderColor: '#C8BEB4', color: TEXT_COLOR }}
                  />
                  <datalist id="relationship-suggestions">
                    {CONTRIBUTOR_RELATIONSHIP_OPTIONS.map((option) => (
                      <option key={option} value={option} />
                    ))}
                    {relationshipGuess ? <option value={relationshipGuess} /> : null}
                  </datalist>
                </label>
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  disabled={saving}
                  className="w-full rounded-full px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: BUTTON_BG }}
                >
                  {saving ? 'Saving...' : isLastPhoto ? 'Finish' : 'Next photo'}
                </button>
              </>
            )}

            {errorMessage ? (
              <p className="text-sm" style={{ color: '#8B3A3A' }}>
                {errorMessage}
              </p>
            ) : null}
          </div>
        </article>

        <div className="flex items-center justify-between text-sm opacity-70">
          <button
            type="button"
            onClick={handleSkipPhoto}
            disabled={saving}
            className="underline-offset-2 hover:underline disabled:opacity-50"
          >
            Skip this photo
          </button>
          <p>
            {currentIndex + 1} / {totalPhotos}
          </p>
        </div>
      </div>
    </main>
  );
}

// frontend/src/app/(viewer)/memorial/[id]/intro/page.jsx
// Viewer landing page — authenticated viewer or organizer.
// Loads memorial via getMemorialById, Start routes to /memorial/[id]/output.

"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMemorialById } from '@/lib/api';
import LandingNav from "@/components/landing/LandingNav.jsx";

function safeYear(dateStr) {
  if (!dateStr) return null;
  const y = new Date(dateStr).getFullYear();
  return Number.isNaN(y) ? null : y;
}

export default function ViewerIntroPage() {
  const { id } = useParams();
  const router = useRouter();
  const [memorial, setMemorial] = useState(null);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const data = await getMemorialById(id);
        const m = data?.memorial ?? data;
        setMemorial({
          subject_name: m?.subject_name || m?.deceased_name || '',
          cover_photo_url: m?.cover_photo_url || m?.profile_photo_url || null,
          date_of_birth: m?.date_of_birth || m?.birth_date || null,
          date_of_passing: m?.date_of_passing || m?.death_date || null,
          biography: m?.brief_biography || m?.short_description || m?.biography || null,
        });
      } catch { /* non-critical — page still renders without data */ }
    }
    load();
  }, [id]);

  const birthYear = safeYear(memorial?.date_of_birth);
  const passingYear = safeYear(memorial?.date_of_passing);

  return (
    <div className="min-h-screen p-(--page-pad-x) flex flex-col">
      <LandingNav />
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="flex flex-col items-center gap-5 max-w-sm w-full text-center">

          {/* Portrait */}
          <div
            className="w-[280px] h-[280px] rounded-full overflow-hidden flex-shrink-0"
            style={{
              backgroundImage: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)",
              backgroundSize: "20px 20px",
            }}
          >
            {memorial?.cover_photo_url && (
              <img
                src={memorial.cover_photo_url}
                alt={memorial.subject_name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Name + years */}
          <div>
            <h1
              className="text-3xl font-normal tracking-wide"
              style={{ color: "#3A3027", fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {memorial?.subject_name || ''}
            </h1>
            {(birthYear || passingYear) && (
              <p
                className="text-sm mt-1"
                style={{ color: "#9B8F80", fontFamily: "system-ui, sans-serif", letterSpacing: "0.04em" }}
              >
                {birthYear ?? ''}
                {birthYear && passingYear ? ' - ' : ''}
                {passingYear ?? ''}
              </p>
            )}
          </div>

          {/* Biography */}
          {memorial?.biography && (
            <p
              className="text-sm leading-relaxed"
              style={{ color: "#6B6051", fontFamily: "system-ui, sans-serif", maxWidth: "280px" }}
            >
              {memorial.biography}
            </p>
          )}

          {/* Start → output page */}
          <button
            onClick={() => { setDisabled(true); router.push(`/memorial/${id}/output`); }}
            disabled={disabled}
            className="mt-2 w-full max-w-xs py-3 rounded-full text-sm tracking-widest uppercase transition-all hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: "#B5A88E",
              color: "#FAF7F2",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "0.12em",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Start memorial experience"
          >
            {disabled ? 'Loading...' : 'Start'}
          </button>
        </div>
      </main>
    </div>
  );
}

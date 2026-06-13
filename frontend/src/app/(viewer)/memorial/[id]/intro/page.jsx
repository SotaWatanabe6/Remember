"use client";


import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getMemorial } from '@/lib/api';
import LandingNav from "@/components/landing/LandingNav.jsx";
import { useRouter } from 'next/navigation';

export default function RememberPage() {
  const { id } = useParams();
  const router = useRouter();
  const [disabled, setDisabled] = useState(false);
  const [memorial, setMemorial] = useState(null);
  const goToOutput = () => {
    setDisabled(true);
    router.push(`/memorial/${id}/output`);
  };  
  useEffect(() => {
    if (!id) return;
    async function loadMemorials() {
      try {

        const result = await getMemorial(id);
        console.log("This is result ",result);
        setMemorial(result.memorial);
      } catch {}
    }
    loadMemorials();
  }, [id]);


  return (
    <div
      className="min-h-screen p-(--page-pad-x) flex flex-col"
    >
      <LandingNav />
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="flex flex-col items-center gap-5 max-w-sm w-full text-center">
          <div
            className="w-44 h-44 rounded-full overflow-hidden flex-shrink-0"
            style={{
              border: "3px solid #D6CFC4",
              backgroundImage:
                "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)",
              backgroundSize: "20px 20px",
            }}
          >
            {memorial ? (
              <img
                src={memorial?.cover_photo_url}
                alt={memorial?.subject_name}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          {/* Name */}
          <div>
            <h1
              className="text-3xl font-normal tracking-wide"
              style={{
                color: "#3A3027",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 400,
              }}
            >
              {memorial?.subject_name}
            </h1>

            {/* Years */}
            <p
              className="text-sm mt-1"
              style={{
                color: "#9B8F80",
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.04em",
              }}
            > 
              {new Date(memorial?.date_of_birth).getFullYear()} - {new Date(memorial?.date_of_passing).getFullYear()} 
            </p> 
          </div>

          {/* Description */}
          <p
            className="text-sm leading-relaxed"
            style={{
              color: "#6B6051",
              fontFamily: "system-ui, sans-serif",
              maxWidth: "280px",
            }}
          >
            {memorial?.biography}
          </p>

          {/* Start button */}
          <button
            onClick={() => goToOutput()}
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
            {disabled ? 'Processing...' : 'Start'}
          </button>
        </div>
      </main>
    </div>
  );
}
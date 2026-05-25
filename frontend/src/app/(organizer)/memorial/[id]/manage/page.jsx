"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header2 from "@/components/ui-components/navs/header2";
import DashboardButton from "@/components/ui-components/buttons/dashboard-button";
import DashboardTab from "../_components/dashboard-tab";
import { getMemorial } from "@/services/memorialService.js";

const tabs = ["Archive", "Contributions", "Outputs"];

const tabItems = {
  Archive: [
    {
      id: "archive-1",
      title: "Family picnic",
      meta: "Photo collection",
      accent: "bg-[#D9D9D9]",
    },
    {
      id: "archive-2",
      title: "Birthday voice note",
      meta: "Audio recording",
      accent: "bg-[#D3D6DB]",
    },
    {
      id: "archive-3",
      title: "Wedding album",
      meta: "Photo archive",
      accent: "bg-[#E1E4E8]",
    },
  ],
  Contributions: [
    {
      id: "contribution-1",
      title: "Jane's memories",
      meta: "Questionnaire response",
      accent: "bg-[#D9D9D9]",
    },
    {
      id: "contribution-2",
      title: "Family voicemail",
      meta: "Voice upload",
      accent: "bg-[#D3D6DB]",
    },
    {
      id: "contribution-3",
      title: "Summer photos",
      meta: "Image contribution",
      accent: "bg-[#E1E4E8]",
    },
  ],
  Outputs: [
    {
      id: "output-1",
      title: "Story sequence",
      meta: "AI-generated output",
      accent: "bg-[#D9D9D9]",
    },
    {
      id: "output-2",
      title: "Constellation themes",
      meta: "AI-generated output",
      accent: "bg-[#D3D6DB]",
    },
    {
      id: "output-3",
      title: "Voices page",
      meta: "AI-generated output",
      accent: "bg-[#E1E4E8]",
    },
  ],
};

function SparkleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[44px] text-[#0A0A0A]"
      fill="currentColor"
    >
      <path d="M12 1.5c.4 4.9 1.2 7.5 2.7 9.1 1.6 1.5 4.2 2.3 9.1 2.7-4.9.4-7.5 1.2-9.1 2.7-1.5 1.6-2.3 4.2-2.7 9.1-.4-4.9-1.2-7.5-2.7-9.1C7.7 13.5 5.1 12.7.2 12.3c4.9-.4 7.5-1.2 9.1-2.7C10.8 8 11.6 5.4 12 1.5Z" />
      <path d="M20.2 2.5c.2 1.7.5 2.7 1.1 3.3.6.5 1.6.9 3.3 1.1-1.7.2-2.7.5-3.3 1.1-.6.6-.9 1.6-1.1 3.3-.2-1.7-.5-2.7-1.1-3.3-.6-.6-1.6-.9-3.3-1.1 1.7-.2 2.7-.5 3.3-1.1.6-.6.9-1.6 1.1-3.3Z" />
    </svg>
  );
}

function MediaCard({ item }) {
  return (
    <article className="flex flex-col gap-4">
      <div className={`h-[318px] w-full rounded-[2px] ${item.accent}`} />
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-[#0A0A0A]">{item.title}</h2>
        <p className="text-body-2 text-(--text-color-2)">{item.meta}</p>
      </div>
    </article>
  );
}

function getYearFromDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString).getFullYear();
}

export default function ManageMemorialPage() {
  const params = useParams();
  const memorialId = params?.id;

  const [memorial, setMemorial] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Archive");

  useEffect(() => {
    if (!memorialId) return;

    let isCancelled = false;

    const loadMemorial = async () => {
      try {
        const data = await getMemorial(memorialId);
        if (!isCancelled) {
          setMemorial(data);
          setError("");
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || "Failed to load memorial");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadMemorial();

    return () => {
      isCancelled = true;
    };
  }, [memorialId]);

  if (isLoading) {
    return (
      <>
        <Header2 backHref="/dashboard" />
        <main className="mx-auto flex w-full max-w-[1340px] flex-col pb-16 pt-[88px] sm:pb-24 sm:pt-[96px]">
          <div className="text-center">Loading memorial...</div>
        </main>
      </>
    );
  }

  if (error || !memorial) {
    return (
      <>
        <Header2 backHref="/dashboard" />
        <main className="mx-auto flex w-full max-w-[1340px] flex-col pb-16 pt-[88px] sm:pb-24 sm:pt-[96px]">
          <div className="text-center text-red-600">
            {error || "Memorial not found"}
          </div>
        </main>
      </>
    );
  }

  const activeItems = tabItems[activeTab];
  const birthYear = getYearFromDate(memorial.date_of_birth);
  const passingYear = getYearFromDate(memorial.date_of_passing);
  const dateRange =
    birthYear || passingYear
      ? `${birthYear ?? "Unknown"} - ${passingYear ?? "Unknown"}`
      : "";

  return (
    <>
      <Header2 backHref="/dashboard" />

      <main className="mx-auto flex w-full max-w-[1340px] flex-col pb-16 pt-[88px] sm:pb-24 sm:pt-[96px]">
        <section className="grid grid-cols-1 gap-10 xl:grid-cols-[420px_1fr_240px] xl:items-center">
          <div className="flex justify-center xl:justify-start">
            {memorial.cover_photo_url ? (
              <img
                src={memorial.cover_photo_url}
                alt={memorial.subject_name}
                className="size-[330px] rounded-full object-cover"
              />
            ) : (
              <div className="size-[330px] rounded-full bg-[#4F627D]" />
            )}
          </div>

          <div className="max-w-[470px]">
            <h1 className="text-h1 text-[#0A0A0A]">{memorial.subject_name}</h1>
            {dateRange && (
              <p className="mt-3 text-h3 text-(--text-color-2)">{dateRange}</p>
            )}
            {memorial.description && (
              <p className="mt-5 text-body-1 text-(--text-color-2)">
                {memorial.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-6 xl:items-end">
            <DashboardButton text="View page" />
            <DashboardButton text="Share" />
            <DashboardButton text="Settings" />
          </div>
        </section>

        <section className="mt-[88px]" aria-label="Dashboard tabs">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {tabs.map((tab) => (
              <DashboardTab
                key={tab}
                text={tab}
                isActive={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </div>
        </section>

        <section className="mt-[54px] flex flex-col gap-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-6 xl:flex-1">
            <SparkleIcon />
            <input
              type="text"
              placeholder="Show me happy memories"
              className="h-[67px] w-full rounded-[16px] border border-[#CAD5E2] bg-white px-6 text-body-1 text-[#0A0A0A] outline-none transition placeholder:text-[#0A0A0A80] focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <DashboardButton text="Filter" />
            <DashboardButton text="Sort" />
          </div>
        </section>

        <section
          className="mt-[56px] grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          aria-label={`${activeTab} items`}
        >
          {activeItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </section>
      </main>
    </>
  );
}

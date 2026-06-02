'use client';

import { useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import {
  generateMemorialOutput,
  getGenerationJobStatus,
  getMemorialOutput,
  getMemorial,
} from '@/services/memorialService';

import { getMemorialContributors } from '@/services/contributorService';
import { mockMemorials } from '@/data/mockMemorials.js';

import ConstellationGraph from "../_components/constellation";
import MemorialContributionsPage from "../_components/contribution-list";
import MemorialContributionApproval from "../_components/contribution-awaiting";
import StorySlideshow from "@/components/output/StorySlideshow";
import VoicesTab from "@/components/output/VoicesTab";
import ProcessingTextSequence from "@/components/dashboard/ProcessingTextSequence";

import { ChevronLeft, ChevronRight } from "lucide-react";

const GENERATION_POLL_INTERVAL_MS = 1500;
const GENERATION_MAX_POLL_ATTEMPTS = 60;

const GENERATION_SUCCESS_STATUSES = new Set([
  "complete",
  "completed",
  "succeeded",
  "success",
]);

const GENERATION_FAILURE_STATUSES = new Set([
  "failed",
  "error",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- AUTH ---------------- */

async function getCurrentAuthToken() {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem("sb-token");
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    return parsed?.access_token || parsed;
  } catch {
    return stored;
  }
}

/* ---------------- PAGE ---------------- */

export default function MemorialOutputPage() {
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState("Outputs");

  const [memorial, setMemorial] = useState(null);

  const [contributors, setContributors] = useState([]);
  const [contributorsLoading, setContributorsLoading] = useState(true);
  const [contributorsError, setContributorsError] = useState(null);

  const [output, setOutput] = useState(null);
  const [outputLoading, setOutputLoading] = useState(true);
  const [outputError, setOutputError] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [generationJob, setGenerationJob] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  const [showShare, setShowShare] = useState(false);

  /* ---------------- MEMORIAL ---------------- */

  useEffect(() => {
    if (!id) return;

    const loadMemorial = async () => {
      try {
        const data = await getMemorial(id);
        const m = data?.memorial ?? data;

        if (!m) throw new Error("No memorial");

        setMemorial({
          id: m.id,
          subject_name: m.subject_name || m.deceased_name,
          cover_photo_url: m.cover_photo_url || m.profile_photo_url || null,
          date_of_birth: m.date_of_birth || m.birth_date || null,
          date_of_passing: m.date_of_passing || m.death_date || null,
          bio: m.brief_biography || m.short_description || null,
          status: m.status || null,
        });
      } catch {
        const fallback = mockMemorials.find((m) => m.id === id) ?? mockMemorials[0];

        setMemorial({
          id: fallback.id,
          subject_name: fallback.subject_name,
          cover_photo_url: fallback.cover_photo_url,
          date_of_birth: fallback.date_of_birth,
          date_of_passing: fallback.date_of_passing,
          bio: fallback.brief_biography,
          status: fallback.status,
        });
      }
    };

    loadMemorial();
  }, [id]);

  /* ---------------- CONTRIBUTORS ---------------- */

  const loadContributors = useCallback(async () => {
    if (!id) return;

    setContributorsLoading(true);
    setContributorsError(null);

    try {
      const token = await getCurrentAuthToken();
      const res = await getMemorialContributors(id, token);

      setContributors(res?.contributors ?? []);
    } catch (err) {
      setContributorsError(err.message || "Failed to load contributors");
      setContributors([]);
    } finally {
      setContributorsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadContributors();
  }, [loadContributors]);

  /* ---------------- OUTPUT ---------------- */

  const loadOutput = useCallback(async () => {
    if (!id) return;

    setOutputLoading(true);
    setOutputError(null);

    try {
      const token = await getCurrentAuthToken();
      const data = await getMemorialOutput(id, token);

      setOutput(data);
    } catch (err) {
      setOutputError(err.message || "Failed to load output");
      setOutput(null);
    } finally {
      setOutputLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOutput();
  }, [loadOutput]);

  /* ---------------- GENERATE ---------------- */

  const handleGenerate = useCallback(async () => {
    if (!id || generating) return;

    setGenerating(true);
    setGenerationError(null);

    try {
      const token = await getCurrentAuthToken();

      const job = await generateMemorialOutput(id, token);
      let current = job?.job;

      setGenerationJob(current);

      for (let i = 0; i < GENERATION_MAX_POLL_ATTEMPTS; i++) {
        const status = (current?.status || "").toLowerCase();

        if (GENERATION_SUCCESS_STATUSES.has(status)) break;
        if (GENERATION_FAILURE_STATUSES.has(status)) {
          throw new Error(current?.error_message || "Generation failed");
        }

        await sleep(GENERATION_POLL_INTERVAL_MS);

        const res = await getGenerationJobStatus(current.id, token);
        current = res?.job ?? current;

        setGenerationJob(current);
      }

      await loadOutput();
    } catch (err) {
      setGenerationError(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [id, generating, loadOutput]);

  /* ---------------- UI HELPERS ---------------- */

  const submittedCount = contributors.filter(
    (c) => c.status === "submitted" || c.submitted_at
  ).length;

  const canGenerate = submittedCount > 0 && !contributorsLoading;

  const generationDisabledMessage =
    submittedCount === 0
      ? "Need at least one contribution"
      : contributorsLoading
      ? "Loading contributors..."
      : "";

  /* ---------------- RENDER ---------------- */

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-8">

        <nav className="flex justify-between">
          <h1 className="text-xl font-semibold">Remember</h1>
          <Link href="/dashboard">Back</Link>
        </nav>

        {/* HEADER */}
        <div>
          <h2 className="text-3xl font-bold">
            {memorial?.subject_name}
          </h2>
        </div>

        {/* TABS */}
        <div className="flex gap-4 border-b">
          {["Archive", "Contributions", "Outputs"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 ${
                activeTab === tab ? "border-b-2 border-black" : ""
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {activeTab === "Contributions" && (
          <div className="grid gap-4">
            {contributorsLoading && <p>Loading...</p>}

            {!contributorsLoading &&
              contributorsError && <p>Error loading contributors</p>}

            {!contributorsLoading &&
              !contributorsError &&
              contributors.length === 0 && (
                <p>No contributors yet</p>
              )}

            {!contributorsLoading &&
              contributors.map((c) => (
                <div key={c.id} className="border p-4 rounded">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500">
                    {c.relationship_type}
                  </p>
                </div>
              ))}
          </div>
        )}

        {activeTab === "Outputs" && (
          <div>
            {!output && !outputLoading && (
              <div className="text-center space-y-4">
                <p>No output yet</p>

                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generating}
                  className="px-4 py-2 bg-black text-white rounded"
                >
                  {generating ? "Generating..." : "Generate"}
                </button>

                {generationError && (
                  <p className="text-red-500">{generationError}</p>
                )}
              </div>
            )}

            {outputLoading && <p>Loading output...</p>}

            {output && (
              <div>
                <h3 className="font-bold mb-2">Story</h3>
                <StorySlideshow output={output} />

                <h3 className="font-bold mt-4">Voices</h3>
                <VoicesTab output={output} />

                <h3 className="font-bold mt-4">Constellation</h3>
                <ConstellationGraph memorial={output} />
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
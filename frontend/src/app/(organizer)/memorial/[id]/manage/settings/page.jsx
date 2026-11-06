"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header2 from "@/components/ui-components/navs/header2.jsx";
import MemorialCreateForm from "@/components/memorial/MemorialCreateForm.jsx";
import { getMemorial } from "@/services/memorialService.js";
import { canEditMemorialProfile } from "@/lib/memorialProfile.mjs";
import { deleteMemorial } from "@/lib/api.js";
import DeleteMemorialDialog from "@/components/memorial/DeleteMemorialDialog.jsx";

export default function MemorialSettingsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletionInFlight = useRef(false);
  const backHref = `/memorial/${id}/manage`;
  const hasCurrentMemorial = memorial?.id === id;

  function closeDeletion() {
    if (deletionInFlight.current || !hasCurrentMemorial) return;
    if (memorial && !canEditMemorialProfile(memorial.status)) {
      router.replace(backHref);
      return;
    }
    setDeleteOpen(false);
    setDeleteError("");
  }

  async function handleDelete() {
    if (deletionInFlight.current || !hasCurrentMemorial) return;
    deletionInFlight.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteMemorial(memorial.id);
      router.replace("/dashboard");
    } catch (deleteFailure) {
      setDeleteError(deleteFailure?.message || "Unable to delete this memorial. Please try again.");
      setDeleting(false);
      deletionInFlight.current = false;
    }
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    getMemorial(id)
      .then((profile) => {
        if (cancelled) return;
        setError("");
        setMemorial(profile);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError?.message || "Unable to load the memorial profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (hasCurrentMemorial && !canEditMemorialProfile(memorial.status)) {
    return (
      <main className="min-h-screen bg-r-bg text-r-text">
        <DeleteMemorialDialog name={memorial.subject_name} deleting={deleting} error={deleteError}
          onClose={closeDeletion} onDelete={handleDelete} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-r-bg px-6 py-8 text-r-text sm:px-[50px] sm:py-[50px]">
      <Header2 backHref={backHref} />

      <section className="mx-auto mt-[92px] flex w-full max-w-[886px] flex-col items-center gap-[64px] sm:gap-[100px]">
        <div className="flex w-full max-w-[508px] flex-col items-center gap-5 text-center">
          <h1 className="font-family-display text-[40px] font-bold leading-[40px] text-r-text">
            Edit memorial details
          </h1>
          <p className="font-family-body text-[20px] leading-[30px] text-r-secondary sm:leading-[20px]">
            Share essential details of your loved one&apos;s life.
          </p>
        </div>

        {loading || (!error && !hasCurrentMemorial) ? (
          <div className="flex min-h-[320px] items-center justify-center" role="status">
            <div className="size-8 animate-spin rounded-full border-2 border-r-border border-t-r-text" />
            <span className="sr-only">Loading memorial profile</span>
          </div>
        ) : error ? (
          <div role="alert" className="w-full max-w-[508px] rounded-[13px] border border-r-border bg-r-modal p-6 text-center text-r-danger">
            {error}
          </div>
        ) : memorial ? (
          <MemorialCreateForm
            mode="edit"
            memorialId={id}
            initialMemorial={memorial}
            backHref={backHref}
            onRequestDelete={() => setDeleteOpen(true)}
          />
        ) : null}
      </section>
      {deleteOpen && hasCurrentMemorial ? (
        <DeleteMemorialDialog name={memorial?.subject_name} deleting={deleting} error={deleteError}
          onClose={closeDeletion} onDelete={handleDelete} />
      ) : null}
    </main>
  );
}

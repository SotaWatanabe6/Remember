"use client";

import { useEffect, useId, useRef } from "react";

export default function DeleteMemorialDialog({ name, deleting, error, onClose, onDelete }) {
  const dialogRef = useRef(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (deleting) dialogRef.current?.focus();
  }, [deleting]);

  function keepFocusInside(event) {
    if (event.key !== "Tab") return;
    const buttons = [...event.currentTarget.querySelectorAll("button:not(:disabled)")];
    if (!buttons.length) { event.preventDefault(); return; }
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={headingId} aria-describedby={descriptionId}
      aria-modal="true" aria-busy={deleting} tabIndex={-1} onKeyDown={keepFocusInside}
      onCancel={(event) => { event.preventDefault(); if (!deleting) onClose(); }}
      className="m-auto max-h-[calc(100svh-48px)] w-[calc(100%-48px)] max-w-[560px] overflow-y-auto rounded-[20px] border border-r-border bg-r-modal p-6 text-r-text backdrop:bg-black/30 sm:p-12">
      <h1 id={headingId} className="font-display text-[32px] font-bold leading-[40px]">Delete the memorial?</h1>
      <p id={descriptionId} className="mt-5 text-base leading-6 text-r-secondary">
        This will permanently delete {name ? `${name}’s memorial` : "the memorial"}, including its contributions and generated memories. Shared links will stop working. This cannot be undone.
      </p>
      {error ? <p role="alert" className="mt-5 text-sm leading-5 text-r-danger">{error}</p> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" autoFocus onClick={onClose} disabled={deleting}
          className="flex min-h-[50px] flex-1 items-center justify-center rounded-full border border-r-border px-5 text-base transition-colors hover:bg-r-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-text disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={onDelete} disabled={deleting}
          className="flex min-h-[50px] flex-1 items-center justify-center rounded-full bg-r-danger px-5 text-base text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-danger disabled:opacity-50">
          {deleting ? "Deleting..." : "Delete the memorial"}
        </button>
      </div>
      {deleting ? <p role="status" className="mt-4 text-sm text-r-secondary">Deleting the memorial. Please wait.</p> : null}
    </dialog>
  );
}

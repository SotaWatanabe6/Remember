"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  beginContributorDraft,
  validateContributorInvite,
} from "@/services/contributorService.js";

const inviteErrorCopy = {
  invalid: {
    title: "This invitation link is not available",
    body: "Please check the link or ask the memorial organizer to send a new invitation.",
  },
  expired: {
    title: "This invitation has expired",
    body: "The contribution window for this link has passed. The organizer can share a new link if they are still collecting memories.",
  },
  closed: {
    title: "Contributions are closed",
    body: "This memorial is not accepting new contributions right now. Thank you for wanting to share a memory.",
  },
  network_error: {
    title: "We could not open this invitation",
    body: "Please check your connection and try again in a moment. If this continues, the memorial organizer can confirm the invitation link.",
  },
  missing_data: {
    title: "This invitation is missing memorial details",
    body: "The invitation was found, but the memorial information is incomplete. Please ask the organizer to review the memorial and invitation.",
  },
  error: {
    title: "We could not open this invitation",
    body: "Something went wrong while checking this invitation. Please try again in a moment.",
  },
};

function InviteErrorState({ status }) {
  const copy = inviteErrorCopy[status] ?? inviteErrorCopy.invalid;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <section className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-medium text-slate-600">
          R
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-[32px] font-medium leading-[38px] text-neutral-950 sm:text-[40px] sm:leading-[48px]">
            {copy.title}
          </h1>
          <p className="text-base leading-7 text-slate-600 sm:text-lg">{copy.body}</p>
        </div>
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <div className="size-12 rounded-full border-2 border-slate-200 border-t-neutral-950" />
        <p className="text-base leading-6 text-slate-600">Opening your invitation...</p>
      </section>
    </main>
  );
}

function DeceasedAvatar({ name, photoUrl }) {
  const initial = useMemo(() => name.trim().charAt(0).toUpperCase() || "R", [name]);

  return (
    <div className="relative flex size-[148px] items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[56px] font-medium text-slate-500 shadow-auth sm:size-[180px] sm:text-[68px]">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Photo of ${name}`}
          fill
          sizes="(min-width: 640px) 180px, 148px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  );
}

export default function ContributorInviteLanding({ inviteToken }) {
  const router = useRouter();
  const [invite, setInvite] = useState(null);
  const [contributorName, setContributorName] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function validateInvite() {
      setIsValidating(true);
      const validation = await validateContributorInvite(inviteToken);

      if (isMounted) {
        setInvite(validation);
        setIsValidating(false);
      }
    }

    validateInvite();

    return () => {
      isMounted = false;
    };
  }, [inviteToken]);

  const trimmedContributorName = contributorName.trim();
  const isBeginDisabled = isSubmitting || trimmedContributorName.length === 0;

  const handleNameChange = (event) => {
    setContributorName(event.target.value);
    setNameError("");
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!trimmedContributorName) {
      setNameError("Please enter your name to begin.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await beginContributorDraft(inviteToken, trimmedContributorName);
      router.push(`/contribute/${inviteToken}/relationship`);
    } catch {
      setSubmitError("We could not begin your contribution. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return <LoadingState />;
  }

  if (!invite || invite.status !== "valid") {
    return <InviteErrorState status={invite?.status ?? "invalid"} />;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-neutral-950 sm:px-[50px] sm:py-[50px]">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[960px] flex-col items-center justify-center gap-10 sm:min-h-[calc(100vh-100px)]">
        <section className="flex w-full flex-col items-center gap-8 text-center">
          <DeceasedAvatar name={invite.deceased.name} photoUrl={invite.deceased.photoUrl} />

          <div className="flex max-w-[640px] flex-col items-center gap-4">
            <p className="text-sm font-medium uppercase leading-5 text-slate-500">
              You have been invited to contribute
            </p>
            <h1 className="text-[38px] font-medium leading-[44px] text-neutral-950 sm:text-[56px] sm:leading-[64px]">
              {invite.deceased.name}
            </h1>
            <p className="max-w-[560px] text-base leading-7 text-slate-600 sm:text-xl sm:leading-8">
              Share a memory, a story, or a few words that will help their family preserve who
              they were.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-2 flex w-full max-w-[520px] flex-col items-stretch gap-5 text-left"
          >
            <div className="flex flex-col gap-[10px]">
              <label
                htmlFor="contributor-name"
                className="text-[17px] font-medium leading-[25px] text-neutral-950"
              >
                Your name
              </label>
              <input
                id="contributor-name"
                name="contributorName"
                type="text"
                value={contributorName}
                onChange={handleNameChange}
                autoComplete="name"
                placeholder="Enter your name"
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "contributor-name-error" : undefined}
                className={`h-[63px] w-full rounded-[13px] border bg-white px-5 text-xl text-neutral-950 outline-none transition placeholder:text-neutral-950/50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
                  nameError ? "border-red-400" : "border-slate-300"
                }`}
              />
              {nameError ? (
                <p id="contributor-name-error" className="text-sm leading-5 text-red-600">
                  {nameError}
                </p>
              ) : null}
            </div>

            {submitError ? (
              <p className="text-center text-sm leading-5 text-red-600" role="alert">
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isBeginDisabled}
              className="flex h-[64px] w-full items-center justify-center rounded-full bg-neutral-950 px-10 text-[20px] font-bold leading-[30px] text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {isSubmitting ? "Beginning..." : "Begin"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

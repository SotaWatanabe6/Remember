"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

function useContributorInvite(inviteToken) {
  const [invite, setInvite] = useState(null);
  const [isValidating, setIsValidating] = useState(true);

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

  return { invite, isValidating };
}

function InviteErrorState({ status }) {
  const copy = inviteErrorCopy[status] ?? inviteErrorCopy.invalid;

  return (
    <ContributorPageShell>
      <section className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-[560px] flex-col items-center justify-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-r-card text-2xl font-medium text-r-secondary">
          R
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="[font-family:var(--font-family-display)] text-[32px] font-bold leading-[38px] text-r-text sm:text-[40px] sm:leading-[52px]">
            {copy.title}
          </h1>
          <p className="text-base leading-7 text-r-secondary sm:text-xl sm:leading-8">
            {copy.body}
          </p>
        </div>
      </section>
    </ContributorPageShell>
  );
}

function LoadingState() {
  return (
    <ContributorPageShell>
      <section className="mx-auto flex min-h-[calc(100vh-140px)] flex-col items-center justify-center gap-4 text-center" aria-live="polite">
        <div className="size-12 animate-spin rounded-full border-2 border-r-border border-t-r-text" />
        <p className="text-base leading-6 text-r-secondary">Opening your invitation...</p>
      </section>
    </ContributorPageShell>
  );
}

function ContributorBrand() {
  return (
    <Link href="/" className="flex items-center gap-5 text-r-text" aria-label="Remember home">
      <Image
        src="/Logo.svg"
        alt=""
        width={34}
        height={36}
        className="h-9 w-[34px] object-contain"
        priority
      />
      <span className="[font-family:var(--font-family-display)] text-2xl font-medium leading-[31px]">
        Remember
      </span>
    </Link>
  );
}

function ContributorPageShell({ children, backHref }) {
  return (
    <main className="min-h-screen bg-r-bg px-6 py-8 text-r-text sm:px-[50px] sm:py-[50px]">
      <header className="flex h-10 items-center justify-between">
        <ContributorBrand />
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center gap-3 text-base leading-6 text-r-text transition-opacity hover:opacity-75"
          >
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={2} />
            Back
          </Link>
        ) : null}
      </header>
      {children}
    </main>
  );
}

function DeceasedAvatar({ name, photoUrl, size = "large" }) {
  const initial = useMemo(() => name.trim().charAt(0).toUpperCase() || "R", [name]);
  const sizeClass = size === "small" ? "size-[100px] text-[40px]" : "size-[220px] text-[76px] sm:size-[314px] sm:text-[104px]";
  const sizes = size === "small" ? "100px" : "(min-width: 640px) 314px, 220px";

  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-r-card [font-family:var(--font-family-display)] font-medium text-r-muted ${sizeClass}`}>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Photo of ${name}`}
          fill
          sizes={sizes}
          className="object-cover"
          unoptimized
        />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  );
}

function PrimaryContributorButton({ children, className = "", ...props }) {
  return (
    <button
      className={`flex h-[62px] w-full max-w-[434px] items-center justify-center rounded-full bg-r-btn px-8 text-xl leading-[26px] text-r-text transition hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function formatYear(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getFullYear());
}

function getMemorialYears(memorial) {
  const birthYear = formatYear(memorial?.date_of_birth ?? memorial?.dateOfBirth ?? memorial?.birth_date);
  const passingYear = formatYear(
    memorial?.date_of_passing ?? memorial?.dateOfPassing ?? memorial?.death_date,
  );

  if (birthYear && passingYear) return `${birthYear} - ${passingYear}`;
  if (birthYear) return `Born ${birthYear}`;
  if (passingYear) return `Passed ${passingYear}`;
  return "";
}

function getMemorialBiography(memorial) {
  return (
    memorial?.biography ??
    memorial?.bio ??
    memorial?.description ??
    memorial?.profile ??
    memorial?.brief_biography ??
    memorial?.short_description ??
    ""
  ).trim();
}

function getFirstName(name) {
  return name.trim().split(/\s+/)[0] || name;
}

function getStoredContributorName(inviteToken) {
  if (typeof window === "undefined") return "";

  try {
    const sessionKey = `remember_contributor_session:${inviteToken}`;
    const session = JSON.parse(localStorage.getItem(sessionKey) || "{}");
    return session?.display_name || session?.contributorName || session?.contributor_name || "";
  } catch {
    return "";
  }
}

export default function ContributorInviteLanding({ inviteToken }) {
  const router = useRouter();
  const { invite, isValidating } = useContributorInvite(inviteToken);

  if (isValidating) {
    return <LoadingState />;
  }

  if (!invite || invite.status !== "valid") {
    return <InviteErrorState status={invite?.status ?? "invalid"} />;
  }

  const subjectName = invite.deceased.name;

  return (
    <ContributorPageShell>
      <section className="mx-auto flex w-full max-w-[886px] flex-col items-center pt-[101px] text-center max-sm:pt-16">
        <div className="flex flex-col items-center gap-5">
          <h1 className="[font-family:var(--font-family-display)] text-[40px] font-bold leading-[52px] text-r-text">
            Welcome to Remember
          </h1>
          <p className="max-w-[886px] text-xl leading-[26px] text-r-secondary sm:leading-[26px]">
            A digital platform where you can create a private, dignified space where family and friends can share memories of your loved one.
          </p>
        </div>

        <div className="mt-[100px] flex min-h-[360px] w-full max-w-[476px] flex-col items-center rounded-[20px] border border-[#97877B] px-5 pb-9 pt-10 max-sm:mt-16">
          <DeceasedAvatar name={subjectName} photoUrl={invite.deceased.photoUrl} size="small" />
          <h2 className="mt-6 max-w-[434px] [font-family:var(--font-family-display)] text-2xl font-medium leading-[31px] text-r-text">
            You&apos;ve been invited to contribute memories of {subjectName}.
          </h2>
          <p className="mt-5 max-w-[434px] text-xl leading-[26px] text-r-secondary">
            Share photos, videos, voice recordings, and written memories that celebrate the life and legacy of someone special.
          </p>
        </div>

        <PrimaryContributorButton
          type="button"
          className="mt-[100px] max-sm:mt-16"
          onClick={() => router.push(`/contribute/${inviteToken}/onboarding`)}
        >
          Start
        </PrimaryContributorButton>
      </section>
    </ContributorPageShell>
  );
}

export function ContributorOnboardingBrief({ inviteToken }) {
  const router = useRouter();
  const { invite, isValidating } = useContributorInvite(inviteToken);

  if (isValidating) {
    return <LoadingState />;
  }

  if (!invite || invite.status !== "valid") {
    return <InviteErrorState status={invite?.status ?? "invalid"} />;
  }

  const subjectName = invite.deceased.name;
  const firstName = getFirstName(subjectName);
  const years = getMemorialYears(invite.memorial);
  const biography = getMemorialBiography(invite.memorial);

  return (
    <ContributorPageShell backHref={`/contribute/${inviteToken}`}>
      <section className="mx-auto flex w-full max-w-[886px] flex-col items-center pt-[101px] max-sm:pt-16">
        <div className="flex max-w-[886px] flex-col items-center gap-5 text-center">
          <h1 className="[font-family:var(--font-family-display)] text-[40px] font-bold leading-[52px] text-r-text">
            Remembering {subjectName}
          </h1>
          <p className="max-w-[886px] text-xl leading-7 text-r-secondary">
            <span className="block">
              You&apos;ve been invited to share your memories with {subjectName} to contribute to their memorial.
            </span>
            <span className="block">
              Remember will get to learn who {firstName} was as a person through your perspective and guide
            </span>
            <span className="block">you on uploading various forms of media.</span>
          </p>
        </div>

        <div className="mt-[100px] grid w-full grid-cols-1 items-start gap-10 sm:grid-cols-[314px_1fr] sm:gap-[139px]">
          <DeceasedAvatar name={subjectName} photoUrl={invite.deceased.photoUrl} />
          <div className="flex max-w-[433px] flex-col text-left max-sm:items-center max-sm:text-center sm:pt-[70px]">
            <h2 className="[font-family:var(--font-family-display)] text-4xl font-medium italic leading-[47px] text-r-text">
              {subjectName}
            </h2>
            {years ? (
              <p className="mt-3 text-base leading-[21px] text-r-secondary">{years}</p>
            ) : null}
            {biography ? (
              <p className="mt-4 text-xl leading-[26px] text-r-secondary">{biography}</p>
            ) : null}
          </div>
        </div>

        <PrimaryContributorButton
          type="button"
          className="mt-[100px] max-sm:mt-16"
          onClick={() => router.push(`/contribute/${inviteToken}/public-contributor`)}
        >
          Continue
        </PrimaryContributorButton>
      </section>
    </ContributorPageShell>
  );
}

export function PublicContributorPage({ inviteToken }) {
  const router = useRouter();
  const { invite, isValidating } = useContributorInvite(inviteToken);
  const [contributorName, setContributorName] = useState(() => getStoredContributorName(inviteToken));
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isValidating) {
    return <LoadingState />;
  }

  if (!invite || invite.status !== "valid") {
    return <InviteErrorState status={invite?.status ?? "invalid"} />;
  }

  const trimmedContributorName = contributorName.trim();
  const isContinueDisabled = isSubmitting || trimmedContributorName.length === 0;

  const handleNameChange = (event) => {
    setContributorName(event.target.value);
    setNameError("");
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!trimmedContributorName) {
      setNameError("Please enter your name.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const result = await beginContributorDraft(inviteToken, trimmedContributorName);

      try {
        const sessionKey = `remember_contributor_session:${inviteToken}`;
        const existing = JSON.parse(localStorage.getItem(sessionKey) || "{}");
        localStorage.setItem(
          sessionKey,
          JSON.stringify({
            ...existing,
            contributorId: result?.contributorId ?? existing.contributorId ?? "",
            contributorToken: result?.contributorToken ?? existing.contributorToken ?? "",
            contributorName: trimmedContributorName,
            display_name: trimmedContributorName,
            is_anonymous: false,
            memorialSubjectName: invite.deceased.name || "",
          }),
        );
      } catch {}

      router.push(`/contribute/${inviteToken}/relationship`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not begin your contribution. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <ContributorPageShell backHref={`/contribute/${inviteToken}/privacy`}>
      <section className="mx-auto flex w-full max-w-[578px] flex-col items-center pt-[101px] max-sm:pt-16">
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="[font-family:var(--font-family-display)] text-[40px] font-bold leading-[52px] text-r-text">
            Contribution privacy
          </h1>
          <p className="text-xl leading-[26px] text-r-secondary">
            Write the name that will be displayed with your contributions.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-[99px] flex w-full max-w-[434px] flex-col items-stretch"
        >
          <label
            htmlFor="contributor-name"
            className="[font-family:var(--font-family-display)] text-2xl font-medium leading-[31px] text-r-text"
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
            placeholder="Full name"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "contributor-name-error" : undefined}
            className={`mt-[10px] h-16 w-full rounded-[13px] border bg-transparent px-5 text-xl leading-[26px] text-r-text outline-none transition placeholder:text-r-secondary focus:border-r-border-focus ${
              nameError ? "border-r-danger" : "border-[#97877B]"
            }`}
          />
          {nameError ? (
            <p id="contributor-name-error" className="mt-2 text-sm leading-5 text-r-danger">
              {nameError}
            </p>
          ) : null}

          {submitError ? (
            <p className="mt-4 text-center text-sm leading-5 text-r-danger" role="alert">
              {submitError}
            </p>
          ) : null}

          <PrimaryContributorButton
            type="submit"
            disabled={isContinueDisabled}
            className="mt-[100px]"
          >
            {isSubmitting ? "Continuing..." : "Continue"}
          </PrimaryContributorButton>
        </form>
      </section>
    </ContributorPageShell>
  );
}

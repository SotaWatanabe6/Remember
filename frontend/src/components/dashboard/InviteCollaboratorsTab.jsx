"use client";

import { useState } from "react";

const shareOptions = [
  {
    title: "Share Via Text",
    description: "Copy link and send in a text message.",
    className: "bg-[rgba(21,93,252,0.19)] text-[#155dfc]",
  },
  {
    title: "Share Via Email",
    description: "Paste link into an email invitation.",
    className: "bg-[rgba(152,16,250,0.19)] text-[#9747ff]",
  },
  {
    title: "Private & Secure",
    description: "Only people with this link can view and contribute.",
    className: "bg-[#dcfce7] text-[#00ae3c]",
  },
];

export default function InviteCollaboratorsTab({ invite }) {
  const [copyState, setCopyState] = useState("Copy Link");

  const handleMockCopy = () => {
    // TODO: Replace this mock-only interaction with invite-link API behavior when backend exists.
    setCopyState("Copied");
    window.setTimeout(() => setCopyState("Copy Link"), 1400);
  };

  return (
    <section
      role="tabpanel"
      id="invite-panel"
      aria-labelledby="invite-tab"
      className="rounded-[20px] border border-[#e2e8f0] bg-white px-6 py-8 shadow-auth sm:px-[50px] sm:py-[63px]"
    >
      <div className="flex flex-col gap-[14px]">
        <h2 className="text-[34px] font-bold leading-[40px] text-black sm:text-[40px] sm:leading-[48px]">
          Invite Contributors
        </h2>
        <p className="max-w-4xl text-lg font-light leading-8 text-black sm:text-xl">
          Share this unique link with family and friends so they can contribute their memories.
        </p>

        <div className="mt-1 flex flex-col gap-3 rounded-[10px] bg-[rgba(144,161,185,0.12)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="min-w-0 break-all text-base font-light leading-7 text-black sm:text-xl">
            {invite.link}
          </p>
          <button
            type="button"
            onClick={handleMockCopy}
            className="h-[41px] shrink-0 rounded-[5px] bg-white px-[15px] text-base font-light text-black transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155dfc] sm:text-xl"
          >
            {copyState}
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {shareOptions.map((option) => (
            <article
              key={option.title}
              className={`rounded-[10px] p-6 sm:p-8 ${option.className}`}
            >
              <h3 className="text-base font-medium leading-7">{option.title}</h3>
              <p className="mt-[11px] text-sm font-light leading-6 text-black">
                {option.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

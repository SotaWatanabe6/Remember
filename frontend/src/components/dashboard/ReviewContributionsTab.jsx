"use client";

import { useState } from "react";
import ContributionCard from "./ContributionCard.jsx";

export default function ReviewContributionsTab({ contributions }) {
  const [mockActions, setMockActions] = useState({});

  const handleMockAction = (contributionId, message) => {
    // TODO: Replace this mock-only action with contribution review API calls when backend exists.
    setMockActions((current) => ({ ...current, [contributionId]: message }));
  };

  return (
    <section
      role="tabpanel"
      id="review-panel"
      aria-labelledby="review-tab"
      className="rounded-[20px] border border-[#e2e8f0] bg-white px-6 py-8 shadow-auth sm:px-[50px] sm:py-[63px]"
    >
      <h2 className="text-[34px] font-bold leading-[40px] text-black sm:text-[40px] sm:leading-[48px]">
        Review Contributions
      </h2>

      {contributions.length > 0 ? (
        <div className="mt-[34px] grid gap-6">
          {contributions.map((contribution) => (
            <ContributionCard
              key={contribution.id}
              contribution={contribution}
              mockAction={mockActions[contribution.id]}
              onMockAction={handleMockAction}
            />
          ))}
        </div>
      ) : (
        <div className="mt-[34px] rounded-[10px] border border-dashed border-[#90a1b9] bg-[rgba(144,161,185,0.12)] p-10 text-center">
          <p className="text-xl font-light leading-8 text-slate-700">
            No contributions have been submitted yet.
          </p>
        </div>
      )}
    </section>
  );
}

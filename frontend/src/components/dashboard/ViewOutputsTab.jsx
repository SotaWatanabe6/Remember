"use client";

import { useState } from "react";
import EmptyOutputPlaceholder from "./EmptyOutputPlaceholder.jsx";
import OutputSubTabs from "./OutputSubTabs.jsx";

const outputPanelLabels = {
  story: "Story",
  constellation: "Constellation",
  voices: "Voices",
  collectionArchive: "Collection Archive",
};

export default function ViewOutputsTab() {
  const [activeOutputTab, setActiveOutputTab] = useState("story");

  return (
    <section
      role="tabpanel"
      id="outputs-panel"
      aria-labelledby="outputs-tab"
      className="rounded-[20px] border border-[#e2e8f0] bg-white px-6 py-8 shadow-auth sm:px-[50px] sm:py-[63px]"
    >
      <div className="rounded-[10px] border border-[#90a1b9] bg-[rgba(144,161,185,0.12)] p-6 sm:p-10">
        <h2 className="text-[34px] font-bold leading-[40px] text-black sm:text-[40px] sm:leading-[48px]">
          AI-Generated Memorial Outputs
        </h2>
        <p className="mt-[13px] max-w-5xl text-base leading-7 text-black sm:text-xl sm:leading-8">
          Outputs are automatically created from approved contributions. They are view-only and private to you.
        </p>
      </div>

      <div className="mt-[34px]">
        <OutputSubTabs
          activeOutputTab={activeOutputTab}
          onOutputTabChange={setActiveOutputTab}
        />
      </div>

      <div
        role="tabpanel"
        id={`${activeOutputTab}-output-panel`}
        aria-labelledby={`${activeOutputTab}-output-tab`}
        aria-label={outputPanelLabels[activeOutputTab]}
        className="mt-[34px] rounded-[10px] border border-[#90a1b9] bg-[rgba(144,161,185,0.12)] p-6 sm:p-10"
      >
        <EmptyOutputPlaceholder activeOutputTab={activeOutputTab} />
      </div>
    </section>
  );
}

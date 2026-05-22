const outputTabs = [
  { id: "story", label: "Story" },
  { id: "constellation", label: "Constellation" },
  { id: "voices", label: "Voices" },
  { id: "collectionArchive", label: "Collection Archive" },
];

export default function OutputSubTabs({ activeOutputTab, onOutputTabChange }) {
  return (
    <div role="tablist" aria-label="Output views" className="w-full overflow-x-auto">
      <div className="flex min-w-max gap-[34px] border-b-4 border-[#d9d9d9]">
        {outputTabs.map((tab) => {
          const isActive = activeOutputTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-output-panel`}
              id={`${tab.id}-output-tab`}
              onClick={() => onOutputTabChange(tab.id)}
              className={`-mb-1 border-b-4 pb-1 text-left text-base font-medium leading-7 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155dfc] sm:text-[20px] sm:leading-[30px] ${
                isActive
                  ? "border-[#155dfc] text-[#155dfc]"
                  : "border-transparent text-[#d9d9d9] hover:text-slate-500"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

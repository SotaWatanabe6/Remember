const tabs = [
  { id: "invite", label: "Invite Collaborators +" },
  { id: "review", label: "Review Contributions" },
  { id: "outputs", label: "View Outputs" },
];

export default function DashboardTabs({ activeTab, onTabChange }) {
  return (
    <div role="tablist" aria-label="Organizer dashboard" className="w-full overflow-x-auto">
      <div className="flex min-w-max gap-[34px] border-b-4 border-[#d9d9d9]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              onClick={() => onTabChange(tab.id)}
              className={`-mb-1 border-b-4 pb-1 text-left text-base font-medium leading-7 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155dfc] sm:text-[20px] sm:leading-[30px] ${
                isActive
                  ? "border-[#155dfc] text-[#155dfc]"
                  : "border-transparent text-[#cad5e2] hover:text-slate-500"
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

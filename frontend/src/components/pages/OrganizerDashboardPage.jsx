"use client";

import { useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell.jsx";
import DashboardTabs from "@/components/dashboard/DashboardTabs.jsx";
import InviteCollaboratorsTab from "@/components/dashboard/InviteCollaboratorsTab.jsx";
import ReviewContributionsTab from "@/components/dashboard/ReviewContributionsTab.jsx";
import ViewOutputsTab from "@/components/dashboard/ViewOutputsTab.jsx";
import { getOrganizerDashboard } from "@/services/dashboardService.js";

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState("invite");
  const dashboard = getOrganizerDashboard();

  return (
    <DashboardShell memorial={dashboard.memorial}>
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "invite" ? <InviteCollaboratorsTab invite={dashboard.invite} /> : null}
      {activeTab === "review" ? (
        <ReviewContributionsTab contributions={dashboard.contributions} />
      ) : null}
      {activeTab === "outputs" ? <ViewOutputsTab /> : null}
    </DashboardShell>
  );
}

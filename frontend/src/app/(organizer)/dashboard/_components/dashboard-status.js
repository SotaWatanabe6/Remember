const DASHBOARD_STATUS = {
  complete: {
    label: "Memorial published",
    className: "bg-[#DCE3C6] text-[#5C6549]",
  },
  collecting: {
    label: "Collecting memories",
    className: "bg-[#CFE1EE] text-[#526776]",
  },
  generating: {
    label: "Collecting memories",
    className: "bg-[#CFE1EE] text-[#526776]",
  },
  draft: {
    label: "Not started",
    className: "bg-[#EFCFC2] text-[#755A55]",
  },
};

export function getDashboardStatus(status) {
  return DASHBOARD_STATUS[String(status || "").toLowerCase()] || DASHBOARD_STATUS.draft;
}

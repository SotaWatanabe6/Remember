export const mockDashboardData = {
  memorial: {
    id: "mock-memorial-1",
    fullName: "Full Name",
    lifespan: "Year-Year",
    shortBiography: "Short Biography",
    status: "Collecting memories",
    privacy: "Invite only",
    organizerName: "Maya Hart",
    nextStep: "Review flagged contributions before the first story draft is prepared.",
    progress: {
      invited: 12,
      contributed: 7,
      reviewed: 4,
      flagged: 2,
    },
  },
  invite: {
    link: "https.uniquelink.com",
    pendingCount: 5,
    acceptedCount: 7,
    suggestedMessage:
      "We are gathering memories of Eleanor and would be grateful for a story, photo, or voice note whenever you feel ready.",
    collaborators: [
      {
        id: "collaborator-1",
        name: "Daniel Hart",
        relationship: "Son",
        status: "Contributed",
      },
      {
        id: "collaborator-2",
        name: "Grace Lin",
        relationship: "Granddaughter",
        status: "Invited",
      },
      {
        id: "collaborator-3",
        name: "Noah Hart",
        relationship: "Nephew",
        status: "Opened invite",
      },
    ],
  },
  contributions: [
    {
      id: "contribution-1",
      contributorName: "Daniel Hart",
      relationship: "Son",
      type: "Story",
      title: "Her seed notebook",
      submittedAt: "2026-05-08T17:32:00.000Z",
      status: "Pending review",
      aiFlagStatus: "Needs review",
      preview:
        "Mom kept a small notebook of every seed she planted, and somehow remembered who gave her each packet.",
    },
    {
      id: "contribution-2",
      contributorName: "Grace Lin",
      relationship: "Granddaughter",
      type: "Photo memory",
      title: "Sunday dinner",
      submittedAt: "2026-05-09T11:14:00.000Z",
      status: "Approved",
      aiFlagStatus: "Clear",
      preview:
        "A photo from the kitchen after Sunday dinner, with Eleanor teaching us how to fold dumplings.",
    },
    {
      id: "contribution-3",
      contributorName: "Noah Hart",
      relationship: "Nephew",
      type: "Voice note",
      title: "The night train west",
      submittedAt: "2026-05-11T20:05:00.000Z",
      status: "Pending review",
      aiFlagStatus: "Clear",
      preview:
        "I wanted to share the story she told me about taking the night train west when she was twenty.",
    },
    {
      id: "contribution-4",
      contributorName: "Priya Shah",
      relationship: "Former student",
      type: "Story",
      title: "The call home",
      submittedAt: "2026-05-12T15:48:00.000Z",
      status: "Pending review",
      aiFlagStatus: "Sensitive detail",
      preview:
        "Mrs. Hart noticed when I stopped coming to class and quietly made sure I had a safe person to call.",
    },
  ],
  outputs: {
    story: {
      status: "Not generated",
    },
    constellation: {
      status: "Not generated",
    },
    voices: {
      status: "Not generated",
    },
    collectionArchive: {
      status: "Not generated",
    },
  },
};

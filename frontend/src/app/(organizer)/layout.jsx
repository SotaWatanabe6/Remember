import OrganizerSession from "@/components/auth/OrganizerSession.jsx";

export default function OrganizerLayout({ children }) {
  return <OrganizerSession>{children}</OrganizerSession>;
}

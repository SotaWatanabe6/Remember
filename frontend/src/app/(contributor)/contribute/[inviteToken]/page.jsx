"use client"
import { use } from "react"
import ContributorInviteLanding from "@/components/contributor/ContributorInviteLanding.jsx";

export default function ContributePage({ params }) {
  const { inviteToken } = use(params);
  return <ContributorInviteLanding inviteToken={inviteToken} />;
}
"use client"

import { useParams } from "next/navigation"
import VoiceUpload from "@/components/contributor/VoiceUpload"

export default function VoicePage() {
  const { inviteToken } = useParams()

  const memorialId    = "00000000-0000-0000-0000-000000000001"
  const contributorId = "00000000-0000-0000-0000-000000000002"

  return (
    <VoiceUpload
      inviteToken={inviteToken}
      memorialId={memorialId}
      contributorId={contributorId}
      onBack={() => window.history.back()}
    />
  )
}
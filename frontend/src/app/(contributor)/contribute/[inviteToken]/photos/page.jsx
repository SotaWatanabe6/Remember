"use client"

import { useParams } from "next/navigation"
import PhotoUpload from "@/components/contributor/PhotoUpload"

export default function PhotosPage() {
  const { inviteToken } = useParams()
  const memorialId    = "00000000-0000-0000-0000-000000000001"
  const contributorId = "00000000-0000-0000-0000-000000000002"

  return (
    <PhotoUpload
      inviteToken={inviteToken}
      memorialId={memorialId}
      contributorId={contributorId}
      onBack={() => window.history.back()}
    />
  )
}
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ContributorUploadNav from '@/components/contributor/ContributorUploadNav';
import { useContributorSubjectName } from '@/lib/contribute/useContributorSubjectName';

const MEDIA_TYPES = [
  { path: 'photos', label: 'Photo', icon: '/icons/contribute-photo.svg' },
  { path: 'voice', label: 'Audio', icon: '/icons/contribute-audio.svg' },
  { path: 'story', label: 'Story (text)', icon: '/icons/contribute-story.svg' },
];

export default function UploadSelectorPage() {
  const { inviteToken } = useParams();
  const deceasedName = useContributorSubjectName(inviteToken) || 'your loved one';

  return (
    <main className="flex min-h-screen flex-col bg-r-bg text-r-text">
      <ContributorUploadNav backHref={`/contribute/${inviteToken}/questions-review`} />
      <div className="flex flex-1 flex-col items-center gap-12 px-6 pb-[50px] pt-10 sm:gap-[100px] sm:px-[50px] sm:pt-[50px]">
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="text-[20px] leading-[26px] text-r-secondary">
            Select the media type to begin uploading your fondest memories of {deceasedName}.
          </p>
        </div>
        <div className="grid w-full max-w-[1340px] grid-cols-1 gap-5 sm:grid-cols-3">
          {MEDIA_TYPES.map((type) => (
            <Link key={type.path} href={`/contribute/${inviteToken}/${type.path}`}
              className="flex min-h-[200px] flex-col items-center justify-center gap-2.5 rounded-[20px] border border-r-muted px-6 text-center transition-colors hover:bg-r-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-text sm:min-h-[335px]">
              <Image src={type.icon} width={50} height={50} alt="" />
              <span className="text-[24px] leading-8 text-r-muted [font-family:var(--font-family-display)]">{type.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

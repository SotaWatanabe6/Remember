'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const cards = [
  { label: 'Photo', key: 'photos' },
  { label: 'Audio', key: 'voice' },
  { label: 'Story (text)', key: 'text' },
];

export default function ContributorUploadPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  return (
    <main className="min-h-screen bg-white font-sans">
      <nav className="flex items-center justify-between px-6 py-4 pt-0 pb-0 border-t-0 border-gray-200">
        <span className="text-sm font-medium text-gray-900 tracking-tight">Remember</span>
        <Link
          href={`/contribute/${inviteToken}/questions`}
          className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </Link>
      </nav>

      <div className="flex flex-col items-center px-6 pt-12 pb-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2 text-center">
          Upload your memories
        </h1>
        <p className="text-sm text-gray-400 mb-10 text-center">
          Select the media type to begin uploading your fondest memories.
        </p>
        <div className="flex gap-4 w-full justify-center">
          {cards.map((card) => (
            <button
              key={card.key}
              onClick={() => {
                if (card.key !== 'text') {
                  router.push(`/contribute/${inviteToken}/${card.key}`);
                }
              }}
              className={`
                flex-1 max-w-[220px] aspect-square border border-gray-200 rounded-2xl
                flex items-center justify-center text-sm text-gray-500
                transition-all duration-150
                ${card.key !== 'text'
                  ? 'hover:border-gray-400 hover:bg-gray-50 cursor-pointer'
                  : 'cursor-default opacity-60'
                }
              `}
            >
              {card.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
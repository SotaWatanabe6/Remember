import Image from 'next/image';
import Link from 'next/link';
import HeaderBrand from '@/components/ui-components/navs/header-brand';

export default function ContributorUploadNav({ backHref, disabled = false }) {
  return (
    <nav className="flex w-full items-center justify-between px-6 py-6 sm:p-[50px]">
      <HeaderBrand />
      <Link href={backHref} aria-disabled={disabled}
        onClick={(event) => { if (disabled) event.preventDefault(); }}
        className="flex items-center gap-2.5 text-base text-r-text transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4">
        <Image src="/icons/contribute-back.svg" width={24} height={24} alt="" />
        Back
      </Link>
    </nav>
  );
}

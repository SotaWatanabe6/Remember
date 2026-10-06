import Image from "next/image";
import Link from "next/link";
import RememberLogo from "@/components/brand/RememberLogo.jsx";

export default function ContributorEntryNav({ backHref }) {
  return (
    <header className="flex h-10 w-full items-center justify-between">
      <RememberLogo href="/" markSrc="/images/contributor/logo.png" />
      <Link href={backHref} className="flex items-center gap-[10px] text-base text-r-text transition-opacity hover:opacity-75">
        <Image src="/icons/contributor-privacy-back.svg" width={24} height={24} alt="" aria-hidden="true" />
        Back
      </Link>
    </header>
  );
}

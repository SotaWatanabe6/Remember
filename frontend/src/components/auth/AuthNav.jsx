import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RememberLogo from "@/components/brand/RememberLogo.jsx";

export default function AuthNav() {
  return (
    <nav className="flex h-10 w-full max-w-[1340px] items-center justify-between" aria-label="Authentication">
      <RememberLogo href="/" />
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2.5 rounded-full px-3 text-center text-base font-normal leading-none text-r-text transition hover:text-r-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus"
      >
        <ArrowLeft aria-hidden="true" className="size-6" strokeWidth={1.8} />
        Back
      </Link>
    </nav>
  );
}

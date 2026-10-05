import Link from "next/link";
import Image from "next/image";

const logoSrc = "/Logo.svg";

export function RememberLogoMark({
  className = "h-9 w-[34px]",
  priority = false,
  src = logoSrc,
}) {
  return (
    <Image
      src={src}
      alt=""
      width={300}
      height={316}
      className={`shrink-0 object-contain ${className}`}
      priority={priority}
      aria-hidden="true"
    />
  );
}

export default function RememberLogo({
  href,
  className = "",
  markClassName = "h-9 w-[34px]",
  markSrc = logoSrc,
}) {
  const content = (
    <>
      <RememberLogoMark className={markClassName} src={markSrc} priority />
      <span className="font-display text-2xl font-medium leading-none text-r-text">
        Remember
      </span>
    </>
  );

  const baseClassName = `inline-flex items-center gap-5 ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClassName} aria-label="Remember home">
        {content}
      </Link>
    );
  }

  return <div className={baseClassName}>{content}</div>;
}

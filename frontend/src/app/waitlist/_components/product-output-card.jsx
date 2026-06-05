import Image from "next/image";
import { useEffect, useState } from "react";

const mobilePreviewShadow =
  "rgba(0, 0, 0, 0.14) 0px 6px 18px -8px";
const desktopPreviewShadow =
  "rgba(0, 0, 0, 0.4) 0px 2px 4px, rgba(0, 0, 0, 0.3) 0px 7px 13px -3px, rgba(0, 0, 0, 0.2) 0px -3px 0px inset";

function ProductPreview({ src, alt }) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const updateMatch = () => setIsDesktop(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);

    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, []);

  return (
    <Image
      className="h-auto min-h-[220px] w-full rounded-2xl object-contain transition-transform duration-300 ease-out hover:-translate-y-2 sm:min-h-[500px] sm:object-cover"
      src={src}
      width={946}
      height={711}
      alt={alt}
      style={{ boxShadow: isDesktop ? desktopPreviewShadow : mobilePreviewShadow }}
    />
  );
}

export default function ProductOutfitCard(props) {
  return (
    <article>
      <ProductPreview src={props.src} alt={props.alt} />
      <p className="mt-4 text-base font-light  sm:text-[16px]">
        {props.description}
      </p>
    </article>
  );
}

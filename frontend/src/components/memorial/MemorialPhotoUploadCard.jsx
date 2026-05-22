import Image from "next/image";

export default function MemorialPhotoUploadCard({
  previewUrl,
  fileName,
  onPhotoChange,
}) {
  return (
    <div className="w-full">
      <label className="group flex min-h-[343px] w-full cursor-pointer flex-col items-center justify-center gap-[15px] rounded-[20px] border border-dashed border-black/70 bg-white px-8 py-16 text-center transition hover:border-black focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-slate-400">
        <span className="flex size-[53px] items-center justify-center overflow-hidden text-neutral-950">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt=""
              width={53}
              height={53}
              unoptimized
              className="h-full w-full rounded-[12px] object-cover"
            />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[53px]" fill="none">
              <path
                d="M12 15V3m0 0 4.5 4.5M12 3 7.5 7.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          )}
        </span>
        <span className="text-xl font-medium leading-none text-neutral-950">
          Upload cover photo
        </span>
        <span className="text-[18px] leading-none text-slate-600 sm:text-[20px]">
          Click to upload or drag and drop
        </span>
        <input type="file" accept="image/*" onChange={onPhotoChange} className="sr-only" />
      </label>
      {fileName ? (
        <p className="text-sm leading-5 text-slate-500">{fileName}</p>
      ) : null}
    </div>
  );
}

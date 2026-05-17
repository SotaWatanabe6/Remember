function StoryOutput() {
  return (
    <div className="relative mx-auto h-[523px] w-full max-w-[1040px] overflow-hidden rounded-[9px] border border-[#90a1b9] bg-white">
      <div className="grid h-full grid-cols-12 grid-rows-8">
        {Array.from({ length: 96 }).map((_, index) => (
          <div
            key={index}
            className={index % 2 === Math.floor(index / 12) % 2 ? "bg-[#f5f5f5]" : "bg-[#e7e7e7]"}
          />
        ))}
      </div>
    </div>
  );
}

function ConstellationOutput() {
  return (
    <div className="relative h-[523px] w-full rounded-[9px] border border-[#90a1b9] bg-[#c4c4c4]">
      <svg viewBox="0 0 1040 523" className="h-full w-full" aria-hidden="true">
        <line x1="130" y1="150" x2="170" y2="280" stroke="#0a0a0a" />
        <line x1="170" y1="280" x2="310" y2="130" stroke="#0a0a0a" />
        <line x1="170" y1="280" x2="470" y2="320" stroke="#0a0a0a" />
        <line x1="310" y1="130" x2="420" y2="260" stroke="#0a0a0a" />
        <line x1="540" y1="310" x2="640" y2="130" stroke="#0a0a0a" />
        <line x1="640" y1="130" x2="820" y2="250" stroke="#0a0a0a" />
        <circle cx="90" cy="120" r="45" fill="#d9d9d9" />
        <circle cx="170" cy="280" r="70" fill="#d9d9d9" />
        <circle cx="310" cy="130" r="86" fill="#d9d9d9" />
        <circle cx="470" cy="320" r="86" fill="#d9d9d9" />
        <circle cx="640" cy="130" r="58" fill="#d9d9d9" />
        <circle cx="820" cy="250" r="132" fill="#d9d9d9" />
      </svg>
    </div>
  );
}

function VoicesOutput() {
  return (
    <div className="grid gap-[13px] rounded-[9px] border border-[#90a1b9] bg-[#c4c4c4] px-[26px] py-[30px]">
      {[1, 2].map((item) => (
        <div key={item} className="relative h-[140px] rounded-[6px] border border-[#90a1b9] bg-[#90a1b9] p-[25px] text-white">
          <p className="text-xl leading-[30px]">Name</p>
          <p className="mt-2 text-xl leading-[30px]">Time Stamp + Recording Length</p>
          <button
            type="button"
            className="absolute right-[26px] top-[38px] flex size-[62px] items-center justify-center rounded-full bg-[#d9d9d9]"
            aria-label="Play recording"
          >
            <span className="ml-1 size-0 border-y-[12px] border-l-[18px] border-y-transparent border-l-black" />
          </button>
        </div>
      ))}
    </div>
  );
}

function CollectionArchiveOutput() {
  return (
    <div className="grid gap-[13px] rounded-[10px] sm:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <article
          key={item}
          className="flex h-[347px] flex-col justify-end rounded-[9px] border border-[#90a1b9] bg-[#c4c4c4]"
        >
          <div className="rounded-b-[9px] border-t border-[#90a1b9] bg-white p-[15px]">
            <h3 className="text-xl font-bold leading-[30px] text-black">Album Title</h3>
            <p className="text-[15px] font-light leading-[30px] text-[#55565a]">By Creator</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function EmptyOutputPlaceholder({ activeOutputTab }) {
  if (activeOutputTab === "constellation") {
    return <ConstellationOutput />;
  }

  if (activeOutputTab === "voices") {
    return <VoicesOutput />;
  }

  if (activeOutputTab === "collectionArchive") {
    return <CollectionArchiveOutput />;
  }

  return <StoryOutput />;
}

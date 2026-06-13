// frontend/src/components/contributor/MemoryOrb.jsx

export default function MemoryOrb({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-full ${className}`}
      style={{
        background: `
          radial-gradient(circle at 30% 72%, var(--color-r-family) 0%, transparent 50%),
          radial-gradient(circle at 66% 34%, var(--color-r-colleague) 0%, transparent 55%),
          radial-gradient(circle at 50% 50%, var(--color-r-bg) 0%, var(--color-r-bg) 100%)
        `,
        filter: "blur(6px) saturate(140%)",
        opacity: 0.85,
      }}
    />
  );
}

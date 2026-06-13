// frontend/src/components/contributor/MemoryOrb.jsx

export default function MemoryOrb({ className = "" }) {
  return (
    <img
      src="/gradient1.svg"
      alt=""
      aria-hidden="true"
      className={`rounded-full object-cover ${className}`}
    />
  );
}
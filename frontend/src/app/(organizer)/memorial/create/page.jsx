import MemorialCreateForm from "@/components/memorial/MemorialCreateForm.jsx";
import MemorialCreateHeader from "@/components/memorial/MemorialCreateHeader.jsx";

export default function MemorialCreatePage() {
  return (
    <main className="min-h-screen bg-r-bg px-6 py-8 text-neutral-950 sm:px-[50px] sm:py-[50px]">
      <MemorialCreateHeader />

      <section className="mx-auto mt-[92px] flex w-full max-w-[980px] flex-col items-center gap-[64px]">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-5 text-center">
          <h1 className="font-family-display text-[40px] font-bold leading-[40px] text-r-text">
            Create a memorial
          </h1>
          <p className="font-family-body text-[20px] leading-[20px] text-[#5F5A52]">
            Share essential details of your loved one&apos;s life.
          </p>
        </div>

        <MemorialCreateForm />
      </section>
    </main>
  );
}

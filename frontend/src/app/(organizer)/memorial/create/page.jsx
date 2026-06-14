import MemorialCreateForm from "@/components/memorial/MemorialCreateForm.jsx";
import MemorialCreateHeader from "@/components/memorial/MemorialCreateHeader.jsx";

export default function MemorialCreatePage() {
  return (
    <main className="min-h-screen bg-r-bg px-6 py-8 text-neutral-950 sm:px-[50px] sm:py-[50px]">
      <MemorialCreateHeader />

      <section className="mx-auto mt-20 flex w-full max-w-[886px] flex-col items-center gap-[50px] sm:mt-[100px]">
        <div className="flex w-full max-w-[508px] flex-col items-center gap-5 text-center">
          <h1 className="text-[34px] font-medium leading-none tracking-normal text-neutral-950 sm:text-[40px]">
            Create Their Profile
          </h1>
          <p className="text-[18px] leading-none text-slate-600 sm:text-[20px]">
            Share essential details of your loved one&apos;s life.
          </p>
        </div>

        <MemorialCreateForm />
      </section>
    </main>
  );
}

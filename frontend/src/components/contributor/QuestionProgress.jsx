export default function QuestionProgress({ currentIndex, totalQuestions }) {
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  return (
    <div className="flex w-full flex-col gap-3" aria-label="Question progress">
      <div className="flex items-center justify-between gap-4 text-sm font-medium leading-5 text-slate-500">
        <span>
          Question {currentIndex + 1} of {totalQuestions}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-neutral-950 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

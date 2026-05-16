export default function AuthInput({
  id,
  label,
  error,
  className = "",
  ...inputProps
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`flex w-full flex-col gap-[10px] ${className}`}>
      <label
        htmlFor={id}
        className="text-[17px] font-medium leading-[25px] text-neutral-950 sm:text-[17.782px]"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`h-[63px] w-full rounded-[13px] border bg-white px-5 text-xl text-neutral-950 outline-none transition placeholder:text-neutral-950/50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-sm leading-5 text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

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
        className="text-[16px] font-normal leading-normal text-r-text"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`h-[63px] w-full rounded-[13px] border bg-transparent px-5 text-[20px] font-normal leading-normal text-r-text outline-none transition placeholder:text-r-secondary focus:border-r-border-focus focus:ring-2 focus:ring-r-border/40 ${
          error ? "border-red-400" : "border-r-muted"
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

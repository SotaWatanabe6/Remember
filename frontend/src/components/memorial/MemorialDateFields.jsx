import Image from "next/image";

function DateField({ id, label, error, variant = "create", ...inputProps }) {
  const errorId = error ? `${id}-error` : undefined;
  const editClasses =
    "h-[63px] rounded-[13px] border-[#97877B] bg-transparent px-5 font-family-body text-[20px] leading-[20px] text-r-text focus:border-r-text focus:ring-r-muted/25";
  const createClasses =
    "h-[63px] rounded-[13px] border-[#cad5e2] bg-white px-5 text-xl text-neutral-950 focus:border-slate-500 focus:ring-slate-200";

  return (
    <div className="flex w-full flex-col gap-[10px]">
      <label htmlFor={id} className={variant === "edit"
        ? "font-family-display text-[24px] font-medium leading-[24px] text-r-text"
        : "text-xl font-medium leading-none text-neutral-950 sm:text-2xl"}>
        {label}
      </label>
      <div className="relative w-full">
        <input
          id={id}
          type="date"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`w-full border outline-none transition focus:ring-2 ${variant === "edit" ? `${editClasses} appearance-none pr-14 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0` : createClasses} ${
            error ? "border-red-400" : variant === "edit" ? "border-r-muted" : "border-[#cad5e2]"
          } ${inputProps.value ? "" : variant === "edit" ? "text-r-secondary" : "text-neutral-950/50"}`}
          {...inputProps}
        />
        {variant === "edit" ? (
          <Image
            src="/icons/drop-down.svg"
            alt=""
            width={26}
            height={23}
            aria-hidden="true"
            className="pointer-events-none absolute right-[18px] top-1/2 h-[23px] w-[26px] -translate-y-1/2"
          />
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-sm leading-5 text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function MemorialDateFields({ values, errors, onChange, variant = "create" }) {
  return (
    <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
      <DateField
        id="memorial-date-of-birth"
        name="date_of_birth"
        label={variant === "edit" ? "Date of birth" : "Date of Birth"}
        value={values.date_of_birth}
        onChange={onChange}
        error={errors.date_of_birth}
        variant={variant}
      />
      <DateField
        id="memorial-date-of-passing"
        name="date_of_passing"
        label={variant === "edit" ? "Date of passing" : "Date of Passing"}
        value={values.date_of_passing}
        onChange={onChange}
        error={errors.date_of_passing}
        variant={variant}
      />
    </div>
  );
}

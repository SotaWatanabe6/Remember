const currentYear = new Date().getFullYear();
const earliestReasonableYear = 1850;
const yearOptions = Array.from(
  { length: currentYear - earliestReasonableYear + 1 },
  (_, index) => String(currentYear - index),
);

function YearField({ id, label, error, ...selectProps }) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex w-full flex-col gap-[10px]">
      <label htmlFor={id} className="text-xl font-medium leading-none text-neutral-950 sm:text-2xl">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`h-[63px] w-full appearance-none rounded-[13px] border bg-white px-5 pr-14 text-xl outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
            error ? "border-red-400" : "border-[#cad5e2]"
          } ${selectProps.value ? "text-neutral-950" : "text-neutral-950/50"}`}
          {...selectProps}
        >
          <option value="">Year</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-5 top-1/2 size-0 -translate-y-1/2 border-l-[10px] border-r-[10px] border-t-[17px] border-l-transparent border-r-transparent border-t-neutral-500"
          aria-hidden="true"
        />
      </div>
      {error ? (
        <p id={errorId} className="text-sm leading-5 text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function MemorialDateFields({ values, errors, onChange }) {
  return (
    <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
      <YearField
        id="memorial-year-of-birth"
        name="year_of_birth"
        label="Year of Birth"
        value={values.year_of_birth}
        onChange={onChange}
        error={errors.year_of_birth}
      />
      <YearField
        id="memorial-year-of-passing"
        name="year_of_passing"
        label="Year of Passing"
        value={values.year_of_passing}
        onChange={onChange}
        error={errors.year_of_passing}
      />
    </div>
  );
}

function DateField({ id, label, error, ...inputProps }) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex w-full flex-col gap-[10px]">
      <label htmlFor={id} className="text-xl font-medium leading-none text-neutral-950 sm:text-2xl">
        {label}
      </label>
      <input
        id={id}
        type="date"
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`h-[63px] w-full rounded-[13px] border bg-white px-5 text-xl outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
          error ? "border-red-400" : "border-[#cad5e2]"
        } ${inputProps.value ? "text-neutral-950" : "text-neutral-950/50"}`}
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

export default function MemorialDateFields({ values, errors, onChange }) {
  return (
    <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
      <DateField
        id="memorial-date-of-birth"
        name="date_of_birth"
        label="Date of Birth"
        value={values.date_of_birth}
        onChange={onChange}
        error={errors.date_of_birth}
      />
      <DateField
        id="memorial-date-of-passing"
        name="date_of_passing"
        label="Date of Passing"
        value={values.date_of_passing}
        onChange={onChange}
        error={errors.date_of_passing}
      />
    </div>
  );
}

import { MEMORIAL_RELATIONSHIPS } from "../../data/mockMemorials.js";

const relationshipOptions = ["Family", ...MEMORIAL_RELATIONSHIPS];

export default function MemorialRelationshipSelect({
  id,
  error,
  label = "Relationship",
  placeholder = "Family",
  labelClassName = "text-base font-medium leading-none text-neutral-950",
  ...selectProps
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex w-full flex-col gap-[10px]">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`h-[63px] w-full appearance-none rounded-[13px] border bg-white px-5 pr-14 text-xl text-neutral-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
            error ? "border-red-400" : "border-[#cad5e2]"
          } ${selectProps.value ? "" : "text-neutral-950/50"}`}
          {...selectProps}
        >
          <option value="">{placeholder}</option>
          {relationshipOptions.map((relationship) => (
            <option key={relationship} value={relationship}>
              {relationship}
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

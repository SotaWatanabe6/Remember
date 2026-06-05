"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createMemorial } from "@/services/memorialService.js";
import { uploadPhotoToSupabase } from "@/lib/supabaseStorage.js";

const currentYear = new Date().getFullYear();

const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, index) =>
  String(currentYear - index),
);

const relationshipOptions = [
  "Family",
  "Friend",
  "Parent",
  "Sibling",
  "Spouse",
  "Child",
  "Partner",
  "Other",
];

const initialRemembered = {
  firstName: "",
  lastName: "",
  nickName: "",
  yearOfBirth: "",
  yearOfPassing: "",
  briefBiography: "",
  photo: null,
  photoName: "",
  photoPreview: null,
  relatedPeople: [
    {
      name: "",
      relationship: "Family",
    },
  ],
};

const fieldClassName =
  "h-[63px] w-full rounded-[13px] border border-r-border bg-white px-5 text-[20px] leading-[30px] text-[#0A0A0A] outline-none transition placeholder:text-[#0A0A0A80] focus:border-r-border-focus focus:ring-2 focus:ring-r-border/40";

const labelClassName = "text-[24px] font-medium leading-none text-[#0A0A0A]";

const smallLabelClassName =
  "text-[16px] leading-[24px] font-medium text-[#0A0A0A]";

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[53px]"
      fill="none"
    >
      <path
        d="M12 15V3m0 0 4.5 4.5M12 3 7.5 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />

      <path
        d="M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ReuploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[48px] text-white"
      fill="currentColor"
    >
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zm-4.35 5.96h-4v4h4v-4z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 50 50"
      className="size-[50px]"
      fill="none"
    >
      <circle cx="25" cy="25" r="22" fill="currentColor" />

      <path
        d="M25 15v20M15 25h20"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 50 50"
      className="size-[50px]"
      fill="none"
    >
      <circle cx="25" cy="25" r="22" fill="currentColor" />

      <path
        d="M16 25h18"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function TextField({ id, label, labelClass = labelClassName, ...props }) {
  return (
    <div className="flex w-full flex-col gap-[10px]">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>

      <input id={id} className={fieldClassName} {...props} />
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  labelClass = labelClassName,
  ...props
}) {
  return (
    <div className="flex w-full flex-col gap-[10px]">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>

      <div className="relative">
        <select
          id={id}
          className={`${fieldClassName} appearance-none pr-14 ${
            props.value ? "text-[#0A0A0A]" : "text-[#818487]"
          }`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-5 top-1/2 size-0 -translate-y-1/2 border-l-[11px] border-r-[11px] border-t-[18px] border-l-transparent border-r-transparent border-t-black/40"
        />
      </div>
    </div>
  );
}

export default function MemorialCreateForm() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [remembered, setRemembered] = useState(initialRemembered);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;

    setRemembered((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateRelatedPerson = (index, field, value) => {
    setRemembered((current) => ({
      ...current,
      relatedPeople: current.relatedPeople.map((person, personIndex) =>
        personIndex === index ? { ...person, [field]: value } : person,
      ),
    }));
  };

  const addRelatedPerson = () => {
    setRemembered((current) => ({
      ...current,
      relatedPeople: [
        ...current.relatedPeople,
        {
          name: "",
          relationship: "Family",
        },
      ],
    }));
  };

  const removeRelatedPerson = (index) => {
    setRemembered((current) => ({
      ...current,
      relatedPeople: current.relatedPeople.filter(
        (_, personIndex) => personIndex !== index,
      ),
    }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setRemembered((current) => ({
          ...current,
          photo: file,
          photoName: file.name,
          photoPreview: e.target?.result ?? null,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let photoUrl = null;

      // Upload photo to Supabase Storage if one was selected
      if (remembered.photo) {
        try {
          photoUrl = await uploadPhotoToSupabase(remembered.photo);
        } catch (uploadErr) {
          throw new Error(`Photo upload failed: ${uploadErr.message}`);
        }
      }

      const memorial = await createMemorial({
        subject_name: `${remembered.firstName} ${remembered.lastName}`.trim(),
        nickname: remembered.nickName,
        date_of_birth: remembered.yearOfBirth
          ? `${remembered.yearOfBirth}-01-01`
          : null,
        date_of_passing: remembered.yearOfPassing
          ? `${remembered.yearOfPassing}-01-01`
          : null,
        biography: remembered.briefBiography,
        related_people: remembered.relatedPeople,
        cover_photo_url: photoUrl,
      });

      if (memorial?.id) {
        router.push(`/memorial/${memorial.id}/manage`);
      }
    } catch (err) {
      setError(err.message || "Failed to create memorial. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const yearSelectOptions = [
    { label: "Year", value: "" },
    ...yearOptions.map((year) => ({
      label: year,
      value: year,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[50px]">
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex w-full flex-col gap-5">
          <TextField
            id="first-name"
            label="First name"
            name="firstName"
            type="text"
            value={remembered.firstName}
            onChange={updateField}
            placeholder="John"
            disabled={isSubmitting}
          />

          <TextField
            id="last-name"
            label="Last name"
            name="lastName"
            type="text"
            value={remembered.lastName}
            onChange={updateField}
            placeholder="Smith"
            disabled={isSubmitting}
          />

          <TextField
            id="nickname"
            label="Nickname"
            name="nickName"
            type="text"
            value={remembered.nickName}
            onChange={updateField}
            placeholder="Smith"
            disabled={isSubmitting}
          />
        </div>

        <div className="w-full">
          <input
            ref={fileInputRef}
            id="photo-input"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="sr-only"
            disabled={isSubmitting}
          />

          {remembered.photoPreview ? (
            <div className="relative h-[343px] w-full overflow-hidden rounded-[20px] border border-[#CAD5E2]">
              <img
                src={remembered.photoPreview}
                alt="Preview"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={triggerFileInput}
                className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/40"
                title="Click to reupload"
              >
                <span className="opacity-0 transition hover:opacity-100">
                  <ReuploadIcon />
                </span>
              </button>
            </div>
          ) : (
            <label
              htmlFor="photo-input"
              className="flex min-h-[343px] w-full cursor-pointer flex-col items-center justify-center gap-[18px] rounded-[20px] border border-dashed border-black/50 bg-white px-8 py-10 text-center transition hover:border-black"
            >
              <span className="text-[#0A0A0A]">
                <UploadIcon />
              </span>

              <span className="text-[20px] leading-[30px] text-slate-500">
                Click to upload or drag and drop
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        <SelectField
          id="year-of-birth"
          label="Year of Birth"
          name="yearOfBirth"
          value={remembered.yearOfBirth}
          onChange={updateField}
          options={yearSelectOptions}
          disabled={isSubmitting}
        />

        <SelectField
          id="year-of-passing"
          label="Year of Passing"
          name="yearOfPassing"
          value={remembered.yearOfPassing}
          onChange={updateField}
          options={yearSelectOptions}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex w-full flex-col gap-[10px]">
        <label htmlFor="brief-biography" className={labelClassName}>
          Brief Biography
        </label>

        <textarea
          id="brief-biography"
          name="briefBiography"
          value={remembered.briefBiography}
          onChange={updateField}
          placeholder="Please share a few words about who they were, what they loved, and any other details you feel is important to preserve their memory."
          className="min-h-[252px] w-full resize-none rounded-[13px] border border-r-border bg-white px-5 py-4 text-[20px] leading-[30px] text-[#0A0A0A] outline-none transition placeholder:text-[#818487] focus:border-r-border-focus focus:ring-2 focus:ring-r-border/40 disabled:opacity-50"
          disabled={isSubmitting}
        />
      </div>

      <section className="flex w-full flex-col gap-[30px]">
        <h2 className="text-[24px] font-medium text-[#0A0A0A]">
          Related people
        </h2>

        <div className="flex flex-col gap-5">
          {remembered.relatedPeople.map((person, index) => {
            const isLastRow = index === remembered.relatedPeople.length - 1;

            return (
              <div
                key={index}
                className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr_50px] lg:items-end"
              >
                <TextField
                  id={`person-name-${index}`}
                  label="Name"
                  labelClass={smallLabelClassName}
                  type="text"
                  value={person.name}
                  onChange={(event) =>
                    updateRelatedPerson(index, "name", event.target.value)
                  }
                  placeholder="Jane"
                  disabled={isSubmitting}
                />

                <SelectField
                  id={`relationship-${index}`}
                  label="Relationship"
                  labelClass={smallLabelClassName}
                  value={person.relationship}
                  onChange={(event) =>
                    updateRelatedPerson(
                      index,
                      "relationship",
                      event.target.value,
                    )
                  }
                  options={relationshipOptions.map((relationship) => ({
                    label: relationship,
                    value: relationship,
                  }))}
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  onClick={
                    isLastRow
                      ? addRelatedPerson
                      : () => removeRelatedPerson(index)
                  }
                  className="flex size-[50px] items-center justify-center self-start text-black transition hover:text-neutral-700 lg:self-end disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isLastRow ? <PlusIcon /> : <MinusIcon />}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="rounded-[10px] bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <div className="flex justify-center pt-[20px]">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[72px] w-full max-w-[434px] items-center justify-center rounded-full bg-r-btn px-10 text-[20px] font-bold leading-[30px] text-r-btn-text transition hover:brightness-95 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Continue"}
        </button>
      </div>
    </form>
  );
}

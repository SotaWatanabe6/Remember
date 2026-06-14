"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createMemorial } from "@/services/memorialService.js";
import { uploadMemorialCoverPhoto, updateMemorial } from "@/lib/api.js";

const currentYear = new Date().getFullYear();

const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, index) =>
  String(currentYear - index),
);

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
};

const fieldClassName =
  "h-[69px] w-full rounded-[18px] border border-r-border bg-[#F6EFE7] px-5 font-family-body text-[20px] leading-[20px] text-[#5F5A52] outline-none transition placeholder:text-[#5F5A52] focus:border-r-border-focus focus:ring-2 focus:ring-r-border/30";

const labelClassName =
  "font-family-display text-[24px] font-medium leading-[24px] text-r-text";

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
            props.value ? "text-[#5F5A52]" : "text-[#5F5A52]"
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
          className="pointer-events-none absolute right-5 top-1/2 size-0 -translate-y-1/2 border-l-[11px] border-r-[11px] border-t-[18px] border-l-transparent border-r-transparent border-t-[#4A4742]"
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

    const safetyTimer = setTimeout(() => {
      setIsSubmitting(false);
      setError((current) =>
        current ||
          "This is taking too long. Make sure you are logged in and the API is running on port 3001.",
      );
    }, 90_000);

    try {
      const subjectName = `${remembered.firstName} ${remembered.lastName}`.trim();
      if (!subjectName) {
        throw new Error("Please enter a first or last name.");
      }

      const memorial = await createMemorial({
        subject_name: subjectName,
        nickname: remembered.nickName,
        date_of_birth: remembered.yearOfBirth
          ? `${remembered.yearOfBirth}-01-01`
          : null,
        date_of_passing: remembered.yearOfPassing
          ? `${remembered.yearOfPassing}-01-01`
          : null,
        biography: remembered.briefBiography,
        related_people: [],
        cover_photo_url: null,
      });

      if (!memorial?.id) {
        throw new Error(
          "Memorial may have been created, but we could not open it. Check your dashboard.",
        );
      }

      if (remembered.photo) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20_000);
        try {
          const upload = await uploadMemorialCoverPhoto(remembered.photo, {
            signal: controller.signal,
          });
          const photoUrl =
            upload.cover_photo_url || upload.storage_path || upload.url;
          if (photoUrl) {
            await updateMemorial(memorial.id, { cover_photo_url: photoUrl });
          }
        } catch (uploadErr) {
          setError(
            `Profile created, but the photo could not be uploaded: ${uploadErr.message || "upload failed"}. You can add it later from manage.`,
          );
        } finally {
          clearTimeout(timeoutId);
        }
      }

      router.push(`/memorial/${memorial.id}/manage`);
    } catch (err) {
      setError(err.message || "Failed to create memorial. Please try again.");
    } finally {
      clearTimeout(safetyTimer);
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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[44px]">
      <div className="grid w-full grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="flex w-full flex-col gap-6">
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
          <label htmlFor="photo-input" className={labelClassName}>
            Profile photo
          </label>
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
            <div className="mt-[10px] flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={triggerFileInput}
                className="relative h-[343px] w-full overflow-hidden rounded-[20px] border border-dashed border-r-border bg-[#F6EFE7] text-left"
                title="Click to reupload"
              >
                <img
                  src={remembered.photoPreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </button>
            </div>
          ) : (
            <label
              htmlFor="photo-input"
              className="mt-[10px] flex min-h-[343px] w-full cursor-pointer flex-col items-center justify-center gap-[18px] rounded-[20px] border border-dashed border-r-border bg-[#F6EFE7] px-8 py-10 text-center transition hover:border-r-border-focus"
            >
              <span className="text-r-text">
                <UploadIcon />
              </span>

              <span className="font-family-body text-[20px] leading-[20px] text-[#5F5A52]">
                Click to upload or drag and drop
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
        <SelectField
          id="year-of-birth"
          label="Year of birth"
          name="yearOfBirth"
          value={remembered.yearOfBirth}
          onChange={updateField}
          options={yearSelectOptions}
          disabled={isSubmitting}
        />

        <SelectField
          id="year-of-passing"
          label="Year of passing"
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
          placeholder="Please share a few words about who they were, what they loved, and any other details you feel is important to preserve their memory. This will be visible to viewers of the contribution and memorial page."
          className="min-h-[272px] w-full resize-none rounded-[18px] border border-r-border bg-[#F6EFE7] px-5 py-4 font-family-body text-[20px] leading-[30px] text-[#5F5A52] outline-none transition placeholder:text-[#5F5A52] focus:border-r-border-focus focus:ring-2 focus:ring-r-border/30 disabled:opacity-50"
          disabled={isSubmitting}
        />
      </div>
      <div className="flex flex-col items-center gap-4 pt-[8px]">
        {error && (
          <div
            role="alert"
            className="w-full max-w-[434px] rounded-[10px] bg-red-50 p-4 text-center text-red-700"
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[72px] w-full max-w-[480px] items-center justify-center rounded-full bg-r-btn px-10 font-family-body text-[20px] font-medium leading-[20px] text-r-btn-text transition hover:brightness-95 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Continue"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createMemorial } from "@/services/memorialService.js";
import { uploadMemorialCoverPhoto } from "@/lib/api.js";
import MemorialDateFields from "@/components/memorial/MemorialDateFields.jsx";
import ProfilePhotoCropper from "@/components/memorial/ProfilePhotoCropper.jsx";
import { DEFAULT_CROP } from "@/lib/imageCrop.js";

const fieldClassName =
  "h-[69px] w-full rounded-[18px] border border-r-border bg-[#F6EFE7] px-5 font-family-body text-[20px] leading-[20px] text-[#5F5A52] outline-none transition placeholder:text-[#5F5A52] focus:border-r-border-focus focus:ring-2 focus:ring-r-border/30";

const labelClassName =
  "font-family-display text-[24px] font-medium leading-[24px] text-r-text";

const initialRemembered = {
  firstName: "",
  lastName: "",
  nickName: "",
  date_of_birth: "",
  date_of_passing: "",
  briefBiography: "",
  photo: null,
  photoName: "",
  photoPreview: null,
  photoCrop: DEFAULT_CROP,
};

function UploadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[53px]" fill="none">
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

function TextField({ id, label, labelClass = labelClassName, required, error, ...props }) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex w-full flex-col gap-[10px]">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        aria-required={required}
        className={fieldClassName}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm leading-5 text-r-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function MemorialCreateForm() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [remembered, setRemembered] = useState(initialRemembered);
  // The untouched file the organizer picked. Kept so the crop can be adjusted
  // again later without re-encoding an already-cropped image.
  const [originalPhoto, setOriginalPhoto] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dateErrors, setDateErrors] = useState({
    date_of_birth: "",
    date_of_passing: "",
  });

  const updateField = (event) => {
    const { name, value } = event.target;
    setRemembered((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleDateChange = (event) => {
    const { name, value } = event.target;
    setRemembered((current) => ({ ...current, [name]: value }));
    setDateErrors((current) => ({ ...current, [name]: "" }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    // Allow re-picking the same file straight after cancelling the cropper.
    event.target.value = "";
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      setFieldErrors((current) => ({
        ...current,
        photo: "Please choose an image file.",
      }));
      return;
    }

    setFieldErrors((current) => ({ ...current, photo: "" }));
    setOriginalPhoto(file);
    setRemembered((current) => ({ ...current, photoCrop: DEFAULT_CROP }));
    setIsCropping(true);
  };

  const handleCropApply = ({ file, crop }) => {
    const previewUrl = URL.createObjectURL(file);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = previewUrl;
    setRemembered((current) => ({
      ...current,
      photo: file,
      photoName: originalPhoto?.name ?? file.name,
      photoPreview: previewUrl,
      photoCrop: crop,
    }));
    setFieldErrors((current) => ({ ...current, photo: "" }));
    setIsCropping(false);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    // Nothing was cropped yet, so drop the pick and leave the field empty.
    if (!remembered.photo) setOriginalPhoto(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const openCropper = () => {
    if (originalPhoto) setIsCropping(true);
  };

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setDateErrors({ date_of_birth: "", date_of_passing: "" });

    const nextFieldErrors = {};
    if (!remembered.firstName.trim()) nextFieldErrors.firstName = "First name is required.";
    if (!remembered.lastName.trim()) nextFieldErrors.lastName = "Last name is required.";
    if (!remembered.briefBiography.trim()) nextFieldErrors.briefBiography = "Brief biography is required.";
    if (!remembered.photo) nextFieldErrors.photo = "A profile photo is required.";

    const nextDateErrors = { date_of_birth: "", date_of_passing: "" };
    if (!remembered.date_of_birth) nextDateErrors.date_of_birth = "Date of birth is required.";
    if (!remembered.date_of_passing) nextDateErrors.date_of_passing = "Date of passing is required.";

    if (
      Object.keys(nextFieldErrors).length ||
      nextDateErrors.date_of_birth ||
      nextDateErrors.date_of_passing
    ) {
      setFieldErrors(nextFieldErrors);
      setDateErrors(nextDateErrors);
      setError("Please complete all required profile fields.");
      return;
    }

    setIsSubmitting(true);

    const safetyTimer = setTimeout(() => {
      setIsSubmitting(false);
      setError((current) =>
        current ||
        "This is taking too long. Make sure you are logged in and the API is running on port 3001.",
      );
    }, 90_000);

    try {
      const controller = new AbortController();
      const uploadTimeout = setTimeout(() => controller.abort(), 20_000);
      let coverPhotoUrl = null;

      try {
        const upload = await uploadMemorialCoverPhoto(remembered.photo, {
          signal: controller.signal,
        });
        coverPhotoUrl = upload.cover_photo_url || upload.storage_path || upload.url || null;
      } catch (uploadErr) {
        throw new Error(
          `Photo upload failed: ${uploadErr.message || "unknown error"}. Please try again.`,
        );
      } finally {
        clearTimeout(uploadTimeout);
      }

      if (!coverPhotoUrl) {
        throw new Error("Photo uploaded but no URL was returned. Please try again.");
      }

      const subjectName = `${remembered.firstName} ${remembered.lastName}`.trim();

      const memorial = await createMemorial({
        subject_name: subjectName,
        nickname: remembered.nickName || null,
        date_of_birth: remembered.date_of_birth || null,
        date_of_passing: remembered.date_of_passing || null,
        biography: remembered.briefBiography.trim(),
        cover_photo_url: coverPhotoUrl,
        related_people: [],
      });

      if (!memorial?.id) {
        throw new Error(
          "Memorial may have been created but we could not open it. Check your dashboard.",
        );
      }

      router.push(`/memorial/${memorial.id}/manage`);
    } catch (err) {
      setError(err.message || "Failed to create memorial. Please try again.");
    } finally {
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isCropping && originalPhoto ? (
        <ProfilePhotoCropper
          file={originalPhoto}
          initialCrop={remembered.photoCrop}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      ) : null}

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
              required
              error={fieldErrors.firstName}
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
              required
              error={fieldErrors.lastName}
            />

            <TextField
              id="nickname"
              label="Nickname"
              name="nickName"
              type="text"
              value={remembered.nickName}
              onChange={updateField}
              placeholder="e.g. Johny"
              disabled={isSubmitting}
              error={fieldErrors.nickName}
            />
          </div>

          <div className="w-full">
            <label htmlFor="photo-input" className={labelClassName}>
              Profile photo
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
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
              <div className="mt-[10px] flex w-full flex-col gap-3">
                <div className="flex h-[343px] w-full flex-col items-center justify-center gap-5 rounded-[20px] border border-dashed border-r-border bg-[#F6EFE7] px-8">
                  <img
                    src={remembered.photoPreview}
                    alt="Profile photo preview"
                    className="size-[200px] rounded-full object-cover"
                  />
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={openCropper}
                      disabled={isSubmitting || !originalPhoto}
                      className="rounded-full bg-r-btn px-6 py-3 font-family-body text-[16px] font-medium leading-[16px] text-r-btn-text transition hover:brightness-95 disabled:opacity-50"
                    >
                      Adjust crop
                    </button>
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      disabled={isSubmitting}
                      className="rounded-full border border-r-border px-6 py-3 font-family-body text-[16px] leading-[16px] text-r-secondary transition hover:bg-r-card disabled:opacity-50"
                    >
                      Replace photo
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[#8A8580]">{remembered.photoName}</p>
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
            {fieldErrors.photo ? (
              <p className="mt-2 text-sm leading-5 text-r-danger">
                {fieldErrors.photo}
              </p>
            ) : null}
          </div>
        </div>

        <MemorialDateFields
          values={{
            date_of_birth: remembered.date_of_birth,
            date_of_passing: remembered.date_of_passing,
          }}
          errors={dateErrors}
          onChange={handleDateChange}
        />

        <div className="flex w-full flex-col gap-[10px]">
          <label htmlFor="brief-biography" className={labelClassName}>
            Brief Biography
            <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            <span className="ml-2 font-family-body text-[16px] font-normal text-[#8A8580]">
              Contributors will see this when they open their invite link
            </span>
          </label>
          <textarea
            id="brief-biography"
            name="briefBiography"
            value={remembered.briefBiography}
            onChange={updateField}
            placeholder="Share a few words about who they were, what they loved, and anything else that feels important to preserve their memory."
            className="min-h-[272px] w-full resize-none rounded-[18px] border border-r-border bg-[#F6EFE7] px-5 py-4 font-family-body text-[20px] leading-[30px] text-[#5F5A52] outline-none transition placeholder:text-[#5F5A52] focus:border-r-border-focus focus:ring-2 focus:ring-r-border/30 disabled:opacity-50"
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.briefBiography)}
            aria-required="true"
            aria-describedby={fieldErrors.briefBiography ? "brief-biography-error" : undefined}
          />
          {fieldErrors.briefBiography ? (
            <p id="brief-biography-error" className="text-sm leading-5 text-r-danger">
              {fieldErrors.briefBiography}
            </p>
          ) : null}
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
            {isSubmitting ? "Uploading photo..." : "Continue"}
          </button>
        </div>
      </form>
    </>
  );
}

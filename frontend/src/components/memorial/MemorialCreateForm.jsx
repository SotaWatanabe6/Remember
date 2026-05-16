"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createMemorial } from "../../services/memorialService.js";
import MemorialDateFields from "./MemorialDateFields.jsx";
import MemorialPhotoUploadCard from "./MemorialPhotoUploadCard.jsx";
import MemorialRelationshipSelect from "./MemorialRelationshipSelect.jsx";

const BIOGRAPHY_MAX_LENGTH = 500;
const yearPattern = /^\d{4}$/;

const initialValues = {
  first_name: "",
  last_name: "",
  nickname: "",
  year_of_birth: "",
  year_of_passing: "",
  brief_biography: "",
  related_person_name: "",
  relationship_to_organizer: "",
};

function TextField({ id, label, error, inputClassName = "", labelClassName = "", ...inputProps }) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex w-full flex-col gap-[10px]">
      <label
        htmlFor={id}
        className={`font-medium leading-none text-neutral-950 ${labelClassName || "text-xl sm:text-2xl"}`}
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`h-[63px] w-full rounded-[13px] border bg-white px-5 text-xl text-neutral-950 outline-none transition placeholder:text-neutral-950/50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
          error ? "border-red-400" : "border-[#cad5e2]"
        } ${inputClassName}`}
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

function AddIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 50 50" className="size-[50px]" fill="none">
      <circle cx="25" cy="25" r="22" fill="currentColor" />
      <path d="M25 15v20M15 25h20" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 50 50" className="size-[50px]" fill="none">
      <circle cx="25" cy="25" r="22" fill="currentColor" />
      <path d="M16 25h18" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function MemorialCreateForm() {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [relatedPeople, setRelatedPeople] = useState([]);
  const [errors, setErrors] = useState({});
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const updateRelatedPerson = (id, field, value) => {
    setRelatedPeople((current) =>
      current.map((person) => (person.id === id ? { ...person, [field]: value } : person)),
    );
  };

  const addRelatedPerson = () => {
    setRelatedPeople((current) => [
      ...current,
      {
        id: `related-person-${Date.now()}`,
        name: "",
        relationship: "",
      },
    ]);
  };

  const removeRelatedPerson = (id) => {
    setRelatedPeople((current) => current.filter((person) => person.id !== id));
  };

  const updatePhotoPreview = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPhotoPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return URL.createObjectURL(file);
    });
  };

  const buildDeceasedName = () =>
    [values.first_name.trim(), values.last_name.trim()].filter(Boolean).join(" ");

  const validate = () => {
    const nextErrors = {};
    const deceasedName = buildDeceasedName();

    if (!deceasedName) {
      nextErrors.first_name = "Please enter their first or last name.";
    }

    if (!values.relationship_to_organizer) {
      nextErrors.relationship_to_organizer = "Please choose a relationship.";
    }

    if (values.year_of_birth && !yearPattern.test(values.year_of_birth)) {
      nextErrors.year_of_birth = "Enter a 4-digit year.";
    }

    if (values.year_of_passing && !yearPattern.test(values.year_of_passing)) {
      nextErrors.year_of_passing = "Enter a 4-digit year.";
    }

    if (
      yearPattern.test(values.year_of_birth) &&
      yearPattern.test(values.year_of_passing) &&
      Number(values.year_of_passing) < Number(values.year_of_birth)
    ) {
      nextErrors.year_of_passing = "Year of passing cannot be before year of birth.";
    }

    if (values.brief_biography.length > BIOGRAPHY_MAX_LENGTH) {
      nextErrors.brief_biography = `Please keep this to ${BIOGRAPHY_MAX_LENGTH} characters or fewer.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const deceasedName = buildDeceasedName();
      const description = values.brief_biography.trim();

      await createMemorial({
        deceased_name: deceasedName,
        relationship_to_organizer: values.relationship_to_organizer,
        year_of_birth: values.year_of_birth,
        year_of_passing: values.year_of_passing,
        birth_date: values.year_of_birth || null,
        death_date: values.year_of_passing || null,
        brief_biography: description,
        short_description: description,
        profile_photo_url: null,
      });
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col items-center gap-[50px]">
      <div className="flex w-full flex-col gap-[50px]">
        <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex w-full flex-col gap-[25px]">
            <TextField
              id="memorial-first-name"
              name="first_name"
              type="text"
              label="First name"
              value={values.first_name}
              onChange={updateField}
              placeholder="John"
              autoComplete="given-name"
              error={errors.first_name}
            />
            <TextField
              id="memorial-last-name"
              name="last_name"
              type="text"
              label="Last name"
              value={values.last_name}
              onChange={updateField}
              placeholder="Smith"
              autoComplete="family-name"
              error={errors.last_name}
            />
            <TextField
              id="memorial-nickname"
              name="nickname"
              type="text"
              label="Nickname"
              value={values.nickname}
              onChange={updateField}
              placeholder="Smith"
              autoComplete="off"
              error={errors.nickname}
            />
          </div>

          <MemorialPhotoUploadCard previewUrl={photoPreviewUrl} onPhotoChange={updatePhotoPreview} />
        </div>

        <MemorialDateFields values={values} errors={errors} onChange={updateField} />

        <div className="flex w-full flex-col gap-[10px]">
          <label htmlFor="memorial-description" className="text-xl font-medium leading-none text-neutral-950 sm:text-2xl">
            Brief Biography
          </label>
          <textarea
            id="memorial-description"
            name="brief_biography"
            value={values.brief_biography}
            onChange={updateField}
            placeholder="Please share a few words about who they were, what they loved, and any other details you feel is important to preserve their memory."
            aria-invalid={Boolean(errors.brief_biography)}
            aria-describedby={errors.brief_biography ? "memorial-description-error" : undefined}
            className={`min-h-[252px] w-full resize-none rounded-[13px] border bg-white px-5 py-4 text-base leading-none text-neutral-950 outline-none transition placeholder:text-neutral-950/50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
              errors.brief_biography ? "border-red-400" : "border-[#cad5e2]"
            }`}
          />
          <div className="flex items-center justify-between gap-4">
            {errors.brief_biography ? (
              <p id="memorial-description-error" className="text-sm leading-5 text-red-600">
                {errors.brief_biography}
              </p>
            ) : (
              <span />
            )}
            <p
              className={`text-sm leading-5 ${
                values.brief_biography.length > BIOGRAPHY_MAX_LENGTH ? "text-red-600" : "text-slate-500"
              }`}
            >
              {values.brief_biography.length}/{BIOGRAPHY_MAX_LENGTH}
            </p>
          </div>
        </div>

        <section className="flex w-full flex-col gap-[30px]" aria-labelledby="related-people-title">
          <h2 id="related-people-title" className="text-xl font-medium leading-none text-neutral-950 sm:text-2xl">
            Related people
          </h2>

          <div className="grid w-full grid-cols-1 items-end gap-5 lg:grid-cols-[1fr_1fr_50px]">
            <TextField
              id="memorial-related-name"
              name="related_person_name"
              type="text"
              label="Name"
              value={values.related_person_name}
              onChange={updateField}
              placeholder="Jane"
              autoComplete="off"
              labelClassName="text-base"
            />
            <MemorialRelationshipSelect
              id="memorial-relationship"
              name="relationship_to_organizer"
              value={values.relationship_to_organizer}
              onChange={updateField}
              error={errors.relationship_to_organizer}
            />
            <button
              type="button"
              aria-label="Add related person"
              onClick={addRelatedPerson}
              className="flex size-[50px] items-center justify-center text-black transition hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
            >
              <AddIcon />
            </button>
          </div>

          {relatedPeople.map((person, index) => (
            <div key={person.id} className="grid w-full grid-cols-1 items-end gap-5 lg:grid-cols-[1fr_1fr_50px]">
              <TextField
                id={`memorial-related-name-${person.id}`}
                name={`related_person_name_${index}`}
                type="text"
                label={`Related person ${index + 2} name`}
                value={person.name}
                onChange={(event) => updateRelatedPerson(person.id, "name", event.target.value)}
                placeholder="Adam"
                autoComplete="off"
                labelClassName="sr-only"
              />
              <MemorialRelationshipSelect
                id={`memorial-relationship-${person.id}`}
                name={`related_person_relationship_${index}`}
                label={`Related person ${index + 2} relationship`}
                value={person.relationship}
                onChange={(event) => updateRelatedPerson(person.id, "relationship", event.target.value)}
                placeholder="Friend"
                labelClassName="sr-only"
              />
              <button
                type="button"
                aria-label={`Remove related person ${index + 2}`}
                onClick={() => removeRelatedPerson(person.id)}
                className="flex size-[50px] items-center justify-center text-black transition hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
              >
                <RemoveIcon />
              </button>
            </div>
          ))}
        </section>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-[72px] w-full max-w-[434px] items-center justify-center rounded-full bg-neutral-950 px-10 text-[20px] font-bold leading-[30px] text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:bg-neutral-500"
      >
        {isSubmitting ? "Creating..." : "Continue"}
      </button>
    </form>
  );
}

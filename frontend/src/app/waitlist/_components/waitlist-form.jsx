"use client";
import { useRef, useEffect, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabaseClient";

export default function WaitlistForm(props) {
  const defaultFormFields = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    interview: false,
  };

  const formModal = useRef(null);

  const [formData, setFormData] = useState(defaultFormFields);
  const [errors, setErrors] = useState(defaultFormFields);
  const [touched, setTouched] = useState(defaultFormFields);
  const [isSubmitted, setSubmitted] = useState(false);

  const patterns = {
    firstName: /^[a-zA-Z\s\-']{2,}$/,
    lastName: /^[a-zA-Z\s\-']{2,}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?1?\s?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}$/,
  };

  const errorMessages = {
    firstName: "Please enter a valid first name",
    lastName: "Please enter a valid last name",
    email: "Please enter a valid email address",
    phone: "Please enter a valid phone number",
  };

  function validate(name, value) {
    if (name === "phone") {
      if (value && !patterns.phone.test(value)) return errorMessages.phone;
      return "";
    }
    if (!value) return `This field is required`;
    if (!patterns[name].test(value)) return errorMessages[name];
    return "";
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validate(name, newValue) }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  }

  const inputBase =
    "w-full border h-10 rounded-sm px-4 py-3 focus:outline focus:outline-[#DCE1D6] transition-colors";
  const inputDefault = "border-[#D9D9D9] focus:border-[#DCE1D6]";
  const inputValid = "border-[#DCE1D6] bg-[#FAFAF8]";
  const inputError = "border-red-400 bg-red-50";

  function getInputStyles(name) {
    if (!touched[name]) return `${inputBase} ${inputDefault}`;
    if (errors[name]) return `${inputBase} ${inputError}`;
    return `${inputBase} ${inputValid}`;
  }

  const isFormValid =
    !errors.firstName &&
    touched.firstName &&
    !errors.lastName &&
    touched.lastName &&
    !errors.email &&
    touched.email &&
    (formData.phone === "" || !errors.phone);

  // open modal
  useEffect(() => {
    if (props.open) {
      formModal.current.showModal();
    }
  }, [props.open]);

  function handleModalClose() {
    formModal.current.close();
    props.close();
  }

  // handle keyboard esc press
  useEffect(() => {
    const dialog = formModal.current;
    dialog.addEventListener("cancel", handleModalClose);
    return () => dialog.removeEventListener("cancel", handleModalClose);
  }, []);

  // handle submit
  async function handleSubmit(e) {
    e.preventDefault();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/waitlist`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      },
    );

    const data = await response.json();

    if (data.error) {
      console.error(data.error);
    } else {
      setSubmitted(true);
    }
  }

  // unsubmitted form state
  return (
    <>
      <dialog
        ref={formModal}
        className="backdrop:bg-[#F2ECE4] bg-transparent max-w-[804px] h-full flex justify-center items-center mx-auto backdrop:opacity-100"
      >
        {/* form */}
        {!isSubmitted && (
          <div className="relative bg-white w-full mx-auto px-6 py-12 flex flex-col gap-10 rounded-3xl">
            <button
              className="absolute right-6 top-5 w-6 h-6"
              onClick={handleModalClose}
            >
              x
            </button>

            {/* text */}
            <div>
              <h2 className="text-[28px] uppercase text-center font-family-display font-bold leading-[34px] tracking-[0.05em]">
                Get Early Access
              </h2>
              <p className="text-center">
                Join the waitlist and we&apos;ll reach out personally when
                Remember is ready for you.
              </p>
            </div>

            <form action="" onSubmit={handleSubmit}>
              <div className="w-full flex flex-col gap-7">
                {/* name */}
                <div className="flex gap-3">
                  <div className="w-[50%] flex flex-col gap-1">
                    <label>First Name</label>
                    <input
                      className={getInputStyles("firstName")}
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {touched.firstName && errors.firstName && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="w-[50%] flex flex-col gap-1">
                    <label>Last Name</label>
                    <input
                      className={getInputStyles("lastName")}
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {touched.lastName && errors.lastName && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* email */}
                <div className="flex flex-col gap-1">
                  <label>Email</label>
                  <input
                    className={getInputStyles("email")}
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {touched.email && errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* phone number */}
                <div className="flex flex-col gap-1">
                  <label>
                    Phone Number
                    <span className="text-[14px] text-[#767676]">
                      {" "}
                      optional
                    </span>
                  </label>
                  <input
                    className={getInputStyles("phone")}
                    type="tel"
                    name="phone"
                    id="phone"
                    placeholder="+1(000) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {touched.phone && errors.phone && (
                    <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>

                {/* bottom wrapper */}
                <div className="flex flex-col gap-5">
                  {/* checkbox */}
                  <div className="flex gap-2 text-[16px] accent-[#6C7C5B]">
                    <input
                      className="w-5"
                      type="checkbox"
                      name="interview"
                      id="interview"
                      checked={formData.interview}
                      onChange={handleChange}
                    />
                    <span className="inline-block text-[#767676] font-semibold">
                      I&apos;m open to a short interview or testimonial session
                      in exchange for founder&apos;s pricing at launch.
                    </span>
                  </div>

                  {/* message to subscriber */}
                  <div>
                    <p className="text-[#767676] text-[10px] uppercase text-center">
                      After your experience, you will receive a short feedback
                      form that helps shape what Remember becomes.
                    </p>
                  </div>

                  <button
                    disabled={!isFormValid}
                    type="submit"
                    className="h-12.5 w-full rounded-sm bg-(--shape-fill) font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    reserve my spot
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* after form submission */}
        {isSubmitted && (
          <div className="relative bg-white w-full mx-auto px-6 py-12 flex flex-col gap-10 rounded-3xl">
            <button
              className="absolute right-6 top-5 w-6 h-6"
              onClick={handleModalClose}
            >
              x
            </button>

            {/* text */}
            <div className="w-[500px] h-[300px] flex flex-col items-center justify-center gap-4">
              <h2 className="text-[28px] uppercase text-center font-family-display font-bold leading-[34px] tracking-[0.02em]">
                Thank you!
              </h2>
              <p className="text-center">We&apos;ll be in touch</p>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

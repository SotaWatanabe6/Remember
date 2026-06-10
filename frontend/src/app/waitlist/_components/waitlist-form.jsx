"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  const shouldReduceMotion = useReducedMotion();

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
    if (type !== "checkbox") {
      setTouched((prev) => ({ ...prev, [name]: true }));
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
    !validate("firstName", formData.firstName) &&
    !validate("lastName", formData.lastName) &&
    !validate("email", formData.email) &&
    !validate("phone", formData.phone) &&
    formData.interview;

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
      `${API_BASE_URL}/waitlist`,
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
        className="mx-auto flex h-full w-full max-w-[804px] items-center justify-center bg-transparent px-4 backdrop:bg-[#F2ECE4] backdrop:opacity-100 sm:px-6"
      >
        {/* form */}
        {!isSubmitted && (
          <motion.div
            className="relative mx-auto flex max-h-[90vh] w-full flex-col gap-8 overflow-y-auto rounded-3xl bg-white px-5 py-10 sm:px-6 sm:py-12"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              className="absolute right-5 top-5 h-6 w-6"
              onClick={handleModalClose}
            >
              x
            </button>

            {/* text */}
            <div>
              <h2 className="text-center text-2xl font-bold uppercase leading-[34px] tracking-[0.05em] font-family-display sm:text-[28px]">
                Get Early Access
              </h2>
              <p className="mx-auto mt-2 max-w-[34rem] text-center text-sm text-[#4f4f4f] sm:text-base">
                Join the waitlist and we&apos;ll reach out personally when
                Remember is ready for you.
              </p>
            </div>

            <form action="" onSubmit={handleSubmit}>
              <div className="w-full flex flex-col gap-7">
                {/* name */}
                <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
                  <div className="flex w-full flex-col gap-1">
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

                  <div className="flex w-full flex-col gap-1">
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
                  <div className="flex items-start gap-3 text-[16px] accent-[#6C7C5B]">
                    <input
                      className="mt-1 w-5 shrink-0"
                      type="checkbox"
                      name="interview"
                      id="interview"
                      required
                      checked={formData.interview}
                      onChange={handleChange}
                    />
                    <span className="inline-block text-sm font-semibold text-[#767676] sm:text-[16px]">
                      By checking this box, I agree to participate in a short
                      follow-up survey about my experience using Remember during
                      this early access period.
                    </span>
                  </div>

                  {/* message to subscriber */}
                  <div>
                    <p className="text-center text-[10px] uppercase text-[#767676]">
                      After your experience, you will receive a short feedback
                      form that helps shape what Remember becomes.
                    </p>
                  </div>

                  <button
                    disabled={!isFormValid}
                    type="submit"
                    className="h-12.5 w-full rounded-sm bg-(--shape-fill) font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-[#AEB99F]"
                  >
                    reserve my spot
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* after form submission */}
        {isSubmitted && (
          <motion.div
            className="relative mx-auto flex w-full flex-col gap-8 rounded-3xl bg-white px-5 py-10 sm:px-6 sm:py-12"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              className="absolute right-5 top-5 h-6 w-6"
              onClick={handleModalClose}
            >
              x
            </button>

            {/* text */}
            <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-4 text-center sm:min-h-[300px] sm:max-w-[500px] sm:self-center">
              <h2 className="text-2xl font-bold uppercase leading-[34px] tracking-[0.02em] font-family-display sm:text-[28px]">
                Thank you!
              </h2>
              <p className="text-center">We&apos;ll be in touch</p>
            </div>
          </motion.div>
        )}
      </dialog>
    </>
  );
}

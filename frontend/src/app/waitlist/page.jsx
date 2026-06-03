"use client";

import { useState } from "react";


import styles from "./wailtist.module.css";
import WaitlistButton from "./_components/waitlist-button";
import ProductOutfitCard from "./_components/product-output-card";
import StepsCard from "./_components/steps-card";
import WaitlistForm from "./_components/waitlist-form";

export default function WaitListPage() {
  const [isSubmitted, setIsSubmitted] = useState(true);
  const [open, setOpen] = useState(false);

  function handleReserveButton() {
    console.log("clicked");
    setOpen(true);
  }

  function handleModalClose() {
    setOpen(false);
  }

  return (
    <>
      {isSubmitted && <div>All done</div>}
      {open && <WaitlistForm open={open} close={handleModalClose} />}
      <div className={`${styles.container} `}>
        <section className="flex flex-col gap-15 mx-auto">
          <header className={`${styles.header}  `}>
            <div className="logo w-full ">Remember.</div>
          </header>

          {/* Hero Section */}
          {/* top */}
          <div className="top max-w-[590px] mx-auto flex flex-col gap-5  items-center">
            <h1 className="text-[32px] tracking-[0.05em] text-left font-bold font-family-display">
              Remember Who They Were,
              <br /> Preserved in One Place.
            </h1>
            <p className=" text-[28px] font-light">
              Built from stories held by the people in their life.
            </p>
            <WaitlistButton onClick={handleReserveButton}>
              reserve a spot
            </WaitlistButton>
            <div className="trust-badges flex justify-center items-center gap-4">
              <span className="text-[11px] font-normal tracking-[0.01px]">
                PRIVATE{" "}
              </span>{" "}
              <span className="little-circle inline-block w-1.25 h-1.25 rounded-full bg-black">
                {" "}
              </span>
              <span className="text-[11px] font-normal tracking-[0.01px]">
                ONE TIME{" "}
              </span>
              <span className="little-circle inline-block w-1.25 h-1.25 rounded-full bg-black">
                {" "}
              </span>
              <span className="text-[11px] font-normal tracking-[0.01px]">
                INVITE ONLY
              </span>
            </div>
          </div>

          {/* botton */}
          <div className="bottom max-w-[745px] h-[205px] mx-auto flex items-center justify-center ">
            <p className="text-[#757575] text-[28px] font-light ">
              A place that looks and sounds like them, and tells their full
              story. Open it years from now and feel like they&apos;re still
              close.
            </p>
          </div>
        </section>
      </div>
      <hr className="h-px w-full mt-20 bg-[#DFDFDF]" />

      {/* What to expect section */}
      <section className="max-w-[947px] mx-auto flex flex-col mt-20 gap-20 ">
        <h2 className="text-[20px] text-left font-medium  w-full tracking-[1px] py-[31px] uppercase max-w-[745px] mx-auto">
          A Glimpse of what we built
        </h2>

        <div className="product-output-cards flex flex-col gap-6">
          <ProductOutfitCard description="The words the people who loved them still carry" />
          <ProductOutfitCard description="Every part of who they were, all connected" />
          <ProductOutfitCard description="Their story, told by the people who knew them best" />
        </div>

        <p className="uppercase text-[11px] text-[#767676]! w-full">
          Remember isn&apos;t perfect yet. But our core value is to create
          something that feels close to the person you&apos;re making this for.
          If what we build doesn&apos;t feel worthy of that person, tell us
          through an interview. That feedback is how we make it right.
        </p>
      </section>

      {/* how it works */}
      <section className="h-70 bg-[#F2ECE4] flex flex-col justify-center mt-20 ">
        <div className="w-full max-w-285 mx-auto flex flex-col gap-6">
          <h3 className="uppercase text-[14px] leading-[20px] tracking-[0.1px] text-[#6C7C5B] font-semibold">
            How it works in <span className="text-[#A85151]"> 3</span> steps
          </h3>

          <div className="w-[1140px] flex px-6  justify-between">
            <StepsCard
              number="01"
              description="Send a contribution link to anyone who knew them"
            />
            <StepsCard
              number="02"
              description="Contributors (including yourself) share answers, photos, and voice recordings"
            />
            <StepsCard
              number="03"
              description="Review, approve, and finalize your creation"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta w-full max-w-285 h-157.5 mx-auto flex flex-col gap-5 items-center justify-center mt-20">
        <p className="uppercase font-medium text-[#767676] text-[11px] tracking-[0.1px]">
          Only 50 waitlist spots available
        </p>
        <h2 className="font-family-display text-[28px] font-bold tracking-[0.05em]">
          Keep Them Close. Reserve Your Spot Above.
        </h2>
        <WaitlistButton onClick={handleReserveButton}>
          reserve a spot{" "}
        </WaitlistButton>
      </section>

      <footer className="bg-black mt-20 flex items-center  h-[48px] px-37.5  ">
        <div className={`${styles.logo} w-full  text-white  mx-auto `}>
          Remember.
        </div>
        <div className="trust-badges flex justify-center items-center gap-4 w-56.25  text-white">
          <span className="little-circle inline-block w-1.25 h-1.25 rounded-full bg-white">
            {" "}
          </span>
          <span className="text-[11px] w-[98px] font-normal tracking-[0.01px]">
            KEEP THEM CLOSE
          </span>{" "}
          <span className="little-circle inline-block w-1.25 h-1.25 rounded-full bg-white">
            {" "}
          </span>
          <span className="text-[11px] font-normal tracking-[0.01px]">
            ALWAYS
          </span>
          <span className="little-circle inline-block w-1.25 h-1.25 rounded-full bg-white">
            {" "}
          </span>
        </div>
      </footer>
    </>
  );
}

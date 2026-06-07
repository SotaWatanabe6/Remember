"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import styles from "./wailtist.module.css";
import WaitlistButton from "./_components/waitlist-button";
import ProductOutfitCard from "./_components/product-output-card";
import StepsCard from "./_components/steps-card";
import WaitlistForm from "./_components/waitlist-form";

export default function WaitListPage() {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const titleFade = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const stepsStagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.18,
        delayChildren: shouldReduceMotion ? 0 : 0.14,
      },
    },
  };

  const stepFade = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const previewStagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.22,
        delayChildren: shouldReduceMotion ? 0 : 0.12,
      },
    },
  };

  const previewReveal = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
      scale: shouldReduceMotion ? 1 : 0.985,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    },
  };

  function handleReserveButton() {
    setOpen(true);
  }

  function handleModalClose() {
    setOpen(false);
  }

  return (
    <>
      {open && <WaitlistForm open={open} close={handleModalClose} />}

      <div className={styles.container}>
        <section className="mx-auto flex min-h-[100svh] w-full flex-col pb-12 sm:pb-16">
          <header className={styles.header}>
            <div className="logo w-full">Remember.</div>
          </header>

          <div className="flex flex-1 flex-col justify-center gap-14 sm:gap-15">
            <div className="top mx-auto flex max-w-[590px] flex-col items-center gap-7 text-center sm:text-left">
              <motion.h1
                className="text-[2rem] font-bold tracking-[0.02em] font-family-display sm:text-[32px]"
                initial="hidden"
                animate="visible"
                variants={titleFade}
              >
                Remember Who They Were,
                <br /> Preserved in One Place.
              </motion.h1>
              <p className="text-2xl font-light sm:text-[28px]">
                Built from stories held by the people in their life.
              </p>
              <motion.div>
                <WaitlistButton onClick={handleReserveButton}>
                  reserve a spot
                </WaitlistButton>
              </motion.div>
              <div className="trust-badges flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <span className="text-[11px] font-normal tracking-[0.01px]">
                  PRIVATE
                </span>
                <span className="little-circle inline-block h-1.25 w-1.25 rounded-full bg-black" />
                <span className="text-[11px] font-normal tracking-[0.01px]">
                  ONE TIME
                </span>
                <span className="little-circle inline-block h-1.25 w-1.25 rounded-full bg-black" />
                <span className="text-[11px] font-normal tracking-[0.01px]">
                  INVITE ONLY
                </span>
              </div>
            </div>

            <div className="bottom mx-auto flex min-h-[160px] max-w-[745px] items-center justify-center sm:min-h-[205px]">
              <p className="text-center text-2xl font-light text-[#757575] sm:text-[28px]">
                A place that looks and sounds like them, and tells their full
                story. Open it years from now and feel like they&apos;re still
                close.
              </p>
            </div>
          </div>
        </section>
      </div>

      <hr className="mt-12 h-px w-full bg-[#DFDFDF] sm:mt-20" />

      <section className="mx-auto mt-16 flex w-full max-w-[947px] flex-col gap-16 px-6 sm:mt-20 sm:gap-20 sm:px-0">
        <h2 className="mx-auto w-full  py-4  text-center font-medium uppercase tracking-[1px] sm:py-[31px] sm:text-[20px]">
          A Glimpse of what we built
        </h2>

        <motion.div
          className="product-output-cards flex flex-col gap-6 md:gap-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={previewStagger}
        >
          <motion.div
            variants={previewReveal}
            whileHover={shouldReduceMotion ? undefined : { y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProductOutfitCard
              src="/images/slideshow-4.png"
              alt="Slideshow preview"
              description="Their story, told by the people who knew them best"
            />
          </motion.div>
          <motion.div
            variants={previewReveal}
            whileHover={shouldReduceMotion ? undefined : { y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProductOutfitCard
              src="/images/constellation-4.png"
              alt="Constellation preview"
              description="Every part of who they were, all connected"
            />
          </motion.div>
          <motion.div
            variants={previewReveal}
            whileHover={shouldReduceMotion ? undefined : { y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ProductOutfitCard
              src="/images/voice-11.png"
              alt="Voices preview"
              description="The words the people who loved them still carry"
            />
          </motion.div>
        </motion.div>

        <p className="w-full text-[11px]   uppercase text-[#767676] ">
          Remember isn&apos;t perfect yet. But our core value is to create
          something that feels close to the person you&apos;re making this for.
          If what we build doesn&apos;t feel worthy of that person, tell us
          through an interview. That feedback is how we make it right.
        </p>
      </section>

      <section className="mt-16 bg-[#F2ECE4] px-6 py-14 sm:mt-20 sm:px-6 sm:py-16">
        <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-8">
          <h3 className="text-[14px]  font-semibold uppercase leading-[20px] tracking-[0.1px] text-[#6C7C5B]">
            How it works in <span className="text-[#A85151]">3</span> steps
          </h3>

          <motion.div
            className="flex flex-col gap-10 sm:flex-row sm:flex-wrap sm:justify-between"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            variants={stepsStagger}
          >
            <motion.div variants={stepFade}>
              <StepsCard
                number="01"
                description="Send a contribution link to anyone who knew them"
              />
            </motion.div>
            <motion.div variants={stepFade}>
              <StepsCard
                number="02"
                description="Contributors (including yourself) share answers, photos, and voice recordings"
              />
            </motion.div>
            <motion.div variants={stepFade}>
              <StepsCard
                number="03"
                description="Review, approve, and finalize your creation"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="cta mx-auto mt-16 flex w-full max-w-[1140px] flex-col items-center justify-center gap-7 px-6 py-16 text-center sm:mt-20 sm:min-h-[80vh] sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.1px] text-[#767676]">
          Only 50 waitlist spots available
        </p>
        <h2 className="font-family-display text-2xl font-bold tracking-[0.05em] sm:text-[28px]">
          Keep Them Close. Reserve Your Spot Above.
        </h2>
        <motion.div
          animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <WaitlistButton onClick={handleReserveButton}>
            reserve a spot
          </WaitlistButton>
        </motion.div>
      </section>

      <footer className="mt-16 bg-black px-6 py-6 sm:mt-20 sm:py-0">
        <div className="mx-auto flex min-h-[48px] w-full max-w-[1140px] flex-col items-center gap-4 sm:h-[48px] sm:flex-row">
          <div
            className={`${styles.logo} mx-auto w-full text-center text-white sm:mx-0 sm:flex-1 sm:text-left`}
          >
            Remember.
          </div>
          <div className="trust-badges flex flex-wrap items-center justify-center gap-3 text-white sm:w-auto sm:shrink-0 sm:flex-nowrap sm:justify-end sm:gap-4">
            <span className="little-circle inline-block h-1.25 w-1.25 rounded-full bg-white" />
            <span className="text-[11px] w-[98px] font-normal tracking-[0.01px]">
              KEEP THEM CLOSE
            </span>
            <span className="little-circle inline-block h-1.25 w-1.25 rounded-full bg-white" />
            <span className="text-[11px] font-normal tracking-[0.01px]">
              ALWAYS
            </span>
            <span className="little-circle inline-block h-1.25 w-1.25 rounded-full bg-white" />
          </div>
        </div>
      </footer>
    </>
  );
}

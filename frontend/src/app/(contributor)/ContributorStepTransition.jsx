"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

const warmBackgroundSteps = ["/photos", "/voice", "/upload", "/story"];

function getContributorBackground(pathname) {
  const isWarmStep = warmBackgroundSteps.some((step) => pathname?.endsWith(step));
  return isWarmStep ? "#F2ECE4" : "#F2ECE4";
}

export default function ContributorStepTransition({ children }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const backgroundColor = getContributorBackground(pathname);

  const variants = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          className="min-h-screen"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.22, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

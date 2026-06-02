'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

const DEFAULT_LINES = [
  'Reading the memories people shared',
  'Finding the moments that appear across stories',
  'Pairing photos with meaningful quotes',
  'Preparing the memorial',
];

const LINE_INTERVAL_MS = 2600;

export default function ProcessingTextSequence({ lines = DEFAULT_LINES }) {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const usableLines = lines.length > 0 ? lines : DEFAULT_LINES;

  useEffect(() => {
    if (usableLines.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % usableLines.length);
    }, LINE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [usableLines.length]);

  const activeLine = usableLines[activeIndex % usableLines.length];

  return (
    <div className="relative mt-3 flex min-h-5 items-center justify-center overflow-hidden" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={activeLine}
          className="text-xs leading-5 text-slate-400"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: 'easeOut' }}
        >
          {activeLine}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

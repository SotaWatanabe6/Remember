'use client';

import { createContext, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { getViewerMotion, VIEWER_MOTION } from '@/lib/viewer/viewerMotion.mjs';

const ViewerContext = createContext({ path: 'intro', active: true });

export function useViewerPath() {
  return useContext(ViewerContext).path;
}

export function useViewerActive() {
  return useContext(ViewerContext).active;
}

function TransitionFrame({ path, vector, className, children, focusOnEnter, name, motionKey }) {
  const parent = useContext(ViewerContext);
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const active = parent.active && present;
  const frameRef = useRef(null);

  return (
    <motion.div
      ref={frameRef}
      className={className}
      data-viewer-transition={name}
      data-viewer-path={path}
      data-viewer-key={motionKey}
      data-viewer-active={active}
      data-motion-state="entering"
      inert={!active}
      aria-hidden={!active || undefined}
      initial="enter"
      animate="visible"
      exit="leave"
      variants={{
        enter: { opacity: reduced ? 1 : 0, x: reduced ? 0 : vector.x, y: reduced ? 0 : vector.y },
        visible: { opacity: 1, x: 0, y: 0, transition: { duration: reduced ? 0 : VIEWER_MOTION.duration, ease: VIEWER_MOTION.ease } },
        leave: { opacity: reduced ? 1 : 0, transition: { duration: reduced ? 0 : VIEWER_MOTION.exitDuration } },
      }}
      onAnimationComplete={(phase) => {
        if (phase !== 'visible' || !active) return;
        frameRef.current?.setAttribute('data-motion-state', 'settled');
        if (focusOnEnter) {
          frameRef.current?.querySelector('h1[tabindex], main[tabindex], [data-viewer-focus]')?.focus({ preventScroll: true });
        }
      }}
    >
      {/* Exiting screens retain their last route and stop media before unmount. */}
      <ViewerContext value={{ path, active }}>{children}</ViewerContext>
    </motion.div>
  );
}

export default function ViewerTransition({ motionKey, path, className, children, focusOnEnter = true, name = 'screen' }) {
  const [route, setRoute] = useState({ key: motionKey, path, previous: path });
  let previous = route.previous;
  if (route.key !== motionKey) {
    previous = route.path;
    setRoute({ key: motionKey, path, previous });
  }
  const vector = getViewerMotion(previous, path);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <TransitionFrame key={motionKey} motionKey={motionKey} path={path} vector={vector} className={className} focusOnEnter={focusOnEnter} name={name}>
        {children}
      </TransitionFrame>
    </AnimatePresence>
  );
}

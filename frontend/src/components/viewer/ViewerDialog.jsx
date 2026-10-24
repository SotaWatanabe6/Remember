'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { VIEWER_MOTION } from '@/lib/viewer/viewerMotion.mjs';
import { useViewerActive } from './ViewerTransition';
import styles from './ViewerDialog.module.css';

export default function ViewerDialog({ label, background = 'bg', className = '', children, onClose, onKeyDown }) {
  const dialogRef = useRef(null);
  const active = useViewerActive();
  const present = useIsPresent();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
    };
  }, [active]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.dialog
      ref={dialogRef}
      className={`${styles.dialog} ${className}`}
      style={{ background: `var(--color-r-${background})` }}
      aria-label={label}
      aria-modal="true"
      inert={!present || !active}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }}
      transition={{ duration: reduced ? 0 : VIEWER_MOTION.exitDuration, ease: VIEWER_MOTION.ease }}
      onCancel={(event) => { event.preventDefault(); if (present && active) onClose(); }}
      onKeyDown={(event) => { if (present && active) onKeyDown?.(event); }}
      onClick={(event) => { if (event.target === event.currentTarget && present && active) onClose(); }}
    >
      {children}
    </motion.dialog>,
    document.body,
  );
}

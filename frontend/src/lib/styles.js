// src/lib/styles.js
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for Remember's design tokens.
// Import COLORS, FONT, and TYPE into every page and component.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Font ─────────────────────────────────────────────────────────────────────
export const FONT = "'Cormorant Garamond', Georgia, serif";

// ─── Typography scale — from Figma style guide ────────────────────────────────
//
//  H1  Bold 700  40px  → main page titles  ("Upload your memories", "Review contributions")
//  H2  Bold 700  36px  → quotes, large display text  (italic in output pages)
//  H3  Medium 500  24px  → section headings, card titles  ("Uploaded photos", "Share")
//  H4  Medium 500  14px  → small labels, tag names  ("Story title", relationship tags)
//  Body 1  Regular 400  20px  → subtitle text under page headings
//  Body 2  Regular 400  16px  → standard body, descriptions, button labels
//  Caption  Regular 400  12px  → timestamps, metadata, footnotes
//
export const TYPE = {
  h1: {
    fontSize: '40px',
    fontWeight: 700,
    lineHeight: '48px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    letterSpacing: '-0.01em',
  },
  h2: {
    fontSize: '36px',
    fontWeight: 700,
    lineHeight: '44px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '24px',
    fontWeight: 500,
    lineHeight: '32px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  h4: {
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '20px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  body1: {
    fontSize: '20px',
    fontWeight: 400,
    lineHeight: '30px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  body2: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '24px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  caption: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: '16px',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
};

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  bg:             '#F2ECE4',
  cardBg:         '#E8E0D8',
  modalBg:        '#FBF9F6',
  text:           '#423F39',
  textSecondary:  '#5F5A52',
  textMuted:      '#97877B',
  border:         '#D4CAC0',
  borderFocus:    '#B8AEA4',
  btn:            '#C4B49A',
  btnText:        '#5F5A52',
  btnSecondary:   '#9B8B7A',
  accent:         '#4A7FA5',
  shapeFill:      '#5F6848',
  danger:         '#C0503A',
  family:         '#AF5F42',
  friend:         '#45556C',
  colleague:      '#59763C',
};

// ─── Usage guide ──────────────────────────────────────────────────────────────
//
// Spread TYPE tokens directly onto style props:
//   <h1 style={{ ...TYPE.h1, color: COLORS.text }}>Upload your memories</h1>
//   <p  style={{ ...TYPE.body2, color: COLORS.textSecondary }}>Subtitle text</p>
//
// Or pick individual values:
//   style={{ fontSize: TYPE.h1.fontSize, fontWeight: TYPE.h1.fontWeight }}
//
// Tailwind equivalent classes for reference:
//   H1  →  text-[40px] font-bold     (font-bold = 700)
//   H2  →  text-[36px] font-bold
//   H3  →  text-[24px] font-medium   (font-medium = 500)
//   H4  →  text-[14px] font-medium
//   Body 2  →  text-[16px] font-normal  (font-normal = 400)

// ─── Layout ───────────────────────────────────────────────────────────────────
// Tailwind class strings for page containers.
// Change these strings once → every page that imports LAYOUT updates instantly.
//
// Usage:
//   import { LAYOUT } from '@/lib/styles';
//   <div className={LAYOUT.shell}>        ← contributor flow pages (680px)
//   <div className={LAYOUT.shellWide}>    ← upload selector, output (960px)
//
export const LAYOUT = {
  // Standard contributor flow pages — photos, voice, story, review, submitted
  shell:     'mx-auto flex w-full max-w-[680px] flex-col gap-8',

  // Wide pages — upload selector (3 cards), output page
  shellWide: 'mx-auto flex w-full max-w-[960px] flex-col gap-8',
};
// To tighten spacing on all pages at once: change gap-8 to gap-6 in both strings above.

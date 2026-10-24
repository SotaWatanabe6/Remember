export const VIEWER_MOTION = {
  duration: 0.28,
  exitDuration: 0.16,
  ease: [0.22, 1, 0.36, 1],
};

const SECTION_VECTORS = {
  relationships: { x: 24, y: 0 },
  story: { x: -24, y: 0 },
  voices: { x: 0, y: -24 },
  photos: { x: 0, y: 24 },
};

export function getViewerMotion(from, to) {
  if (from === to) return { x: 0, y: 0 };
  const previous = from.split('/');
  const next = to.split('/');
  if (next[0] === previous[0]) {
    if (next[0] === 'photo') return { x: Number(next[1]) > Number(previous[1]) ? 16 : -16, y: 0 };
    if (next[0] === 'story' && next[1] === 'slide' && previous[1] === 'slide') {
      return { x: 0, y: Number(next[2]) > Number(previous[2]) ? 16 : -16 };
    }
    return { x: next.length >= previous.length ? 16 : -16, y: 0 };
  }
  if (to === 'navigation' || to === 'intro') {
    const vector = SECTION_VECTORS[previous[0]] || { x: 0, y: 16 };
    return { x: -vector.x, y: -vector.y };
  }
  return SECTION_VECTORS[next[0]] || { x: 0, y: 16 };
}

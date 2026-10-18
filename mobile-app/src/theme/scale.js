import { PixelRatio, useWindowDimensions } from 'react-native';

const DESIGN_WIDTH = 390;

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Layout sizes in dp and type sizes in sp, scaled from a 390-wide design
 * so cards, icons, and text stay proportional on narrow and wide phones.
 */
export function useScale() {
  const { width, height, fontScale } = useWindowDimensions();
  const factor = clamp(width / DESIGN_WIDTH, 0.84, 1.28);
  const typeScale = clamp(fontScale || 1, 0.85, 1.35);
  const dp = (n) => PixelRatio.roundToNearestPixel(n * factor);
  const sp = (n) => PixelRatio.roundToNearestPixel(n * factor * typeScale);
  const pct = (p) => (width * p) / 100;
  return {
    width,
    height,
    factor,
    dp,
    sp,
    pct,
    pad: Math.round(clamp(pct(5), 14, 28)),
    columns: width >= 720 ? 3 : 2,
    isCompact: width < 360,
  };
}

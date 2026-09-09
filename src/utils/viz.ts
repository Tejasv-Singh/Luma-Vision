/**
 * Chart colour tokens — validated, not eyeballed.
 *
 * Every set below was run through the data-viz palette validator against this
 * app's dark panel surface (#141a3a). Results, so future edits can be re-checked:
 *
 *   SERIES (3 slots, --pairs all) ... PASS  (worst normal-vision ΔE 20.9,
 *                                            worst CVD ΔE 9.4, all ≥3:1)
 *   HEAT   (6 steps, --ordinal) ..... PASS  (monotone L, ΔL ≥0.06, light end
 *                                            2.18:1 vs surface, hue spread 4°)
 *
 * Two rules this file exists to enforce:
 *   1. Brand gold (#ffc107) is a *UI* accent and a single-series colour only.
 *      Its lightness (L 0.844) sits outside the dark-mode categorical band, so
 *      it must never be slot 1 of a multi-series palette.
 *   2. Colour follows the entity, never its rank — index into SERIES by a
 *      stable key, never by the current sort position.
 */

/** Single-series / emphasis colour. One colour needs no separation check. */
export const ACCENT = '#ffc107';

/** De-emphasised marks in an "highlight one, mute the rest" chart. 4.80:1. */
export const MUTED = '#7d86b4';

/**
 * Categorical slots for multi-series charts (compare view, forehand/backhand).
 * Capped at three: the reference palette's first three slots are the ones that
 * clear the all-pairs floors, which is what scatter/legend contexts need.
 */
export const SERIES = ['#3987e5', '#d95926', '#199e70'] as const;

/** Ordinal ramp for court-zone intensity: one hue, low → high. */
export const HEAT_RAMP = ['#63501f', '#83681a', '#a48114', '#c69b0d', '#e6ad06', '#ffc107'] as const;

/** Fixed status palette. Never reused as a series colour; always with a label. */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

/** Recessive chart chrome for the dark surface. */
export const CHROME = {
  surface: '#141a3a',
  grid: 'rgba(255,255,255,0.07)',
  axis: 'rgba(255,255,255,0.14)',
  ink: '#f4f6ff',
  inkSecondary: '#a8b0d8',
  inkMuted: '#7d86b4',
} as const;

/** Maps a 0-1 magnitude onto the validated ordinal ramp. */
export function heatColor(normalised: number): string {
  if (!Number.isFinite(normalised)) return HEAT_RAMP[0];
  const index = Math.min(
    HEAT_RAMP.length - 1,
    Math.max(0, Math.floor(normalised * HEAT_RAMP.length)),
  );
  return HEAT_RAMP[index] ?? HEAT_RAMP[0];
}

/** Stable per-entity series colour. Keyed by id so filtering never repaints. */
export function seriesColor(index: number): string {
  return SERIES[index % SERIES.length] ?? SERIES[0];
}

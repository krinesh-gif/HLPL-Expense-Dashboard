/**
 * Category colours.
 *
 * Each key resolves to three steps: a solid for dots and bars, a soft tint for
 * chip backgrounds, and an ink step for text sitting on that tint. Chip text is
 * always the ink step, never the solid, so a chip stays legible whatever hue it
 * carries — colour is redundant next to the icon and the name.
 */
export const PALETTE = {
  blue:   { solid: "#2a78d6", soft: "#e8f0fb", ink: "#1a4f8f", dSolid: "#3987e5", dSoft: "#16283d", dInk: "#9cc4f0" },
  sky:    { solid: "#0e87a8", soft: "#e2f2f6", ink: "#0a5a70", dSolid: "#2ba0c0", dSoft: "#0e2b33", dInk: "#8fd2e4" },
  teal:   { solid: "#1baf7a", soft: "#e3f5ee", ink: "#0f6f4d", dSolid: "#199e70", dSoft: "#0d2b22", dInk: "#84dbba" },
  green:  { solid: "#3f9142", soft: "#e9f3e8", ink: "#2a6b2c", dSolid: "#57a95a", dSoft: "#162a17", dInk: "#a5d6a6" },
  lime:   { solid: "#6f9412", soft: "#eff4e0", ink: "#4c660c", dSolid: "#89ad2c", dSoft: "#232b0e", dInk: "#c3da84" },
  amber:  { solid: "#eda100", soft: "#fdf2dc", ink: "#8a5c00", dSolid: "#c98500", dSoft: "#33260a", dInk: "#f0c766" },
  orange: { solid: "#eb6834", soft: "#fdeae2", ink: "#9c3d16", dSolid: "#d95926", dSoft: "#361c11", dInk: "#f3a483" },
  red:    { solid: "#e34948", soft: "#fdeaea", ink: "#9c2726", dSolid: "#e66767", dSoft: "#361616", dInk: "#f0a2a2" },
  pink:   { solid: "#d8548b", soft: "#fce9f1", ink: "#932f5c", dSolid: "#d55181", dSoft: "#33141f", dInk: "#efa4c2" },
  violet: { solid: "#7b52c4", soft: "#f0e9fb", ink: "#523383", dSolid: "#9085e9", dSoft: "#221a38", dInk: "#c3b4f2" },
  indigo: { solid: "#4a3aa7", soft: "#e9e7f7", ink: "#332777", dSolid: "#7a6ee0", dSoft: "#1b1836", dInk: "#b3aaee" },
  slate:  { solid: "#5f6b7a", soft: "#eceef1", ink: "#3d4753", dSolid: "#8b97a6", dSoft: "#20252b", dInk: "#bcc4cd" },
} as const;

export type ColorKey = keyof typeof PALETTE;

export const COLOR_KEYS = Object.keys(PALETTE) as ColorKey[];

export function isColorKey(v: string): v is ColorKey {
  return v in PALETTE;
}

export function colorOf(key: string): (typeof PALETTE)[ColorKey] {
  return isColorKey(key) ? PALETTE[key] : PALETTE.slate;
}

/**
 * Cost-centre series colours for the monthly chart. Slots 1-3 of the validated
 * categorical order, which clears the all-pairs CVD and normal-vision floors in
 * both modes; the chart keeps its legend, which covers the aqua contrast relief.
 */
export const SERIES = {
  WH: { light: "#2a78d6", dark: "#3987e5" },
  HO: { light: "#eb6834", dark: "#d95926" },
  FOUNDER: { light: "#1baf7a", dark: "#199e70" },
} as const;

/** A short, friendly emoji set the founder can pick from when editing a head. */
export const ICON_CHOICES = [
  "📦","🚚","🎁","☕","👷","🧹","🏠","💡","🔧","📎","🖨️","🛺","✈️","💻","🖥️","📶",
  "📣","🎀","⚖️","🏛️","🏦","🪑","⚙️","🔖","❓","🍱","⛽","🧾","🎉","🩺","📱","🛒",
];

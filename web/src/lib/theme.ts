// Reads design tokens from the Tailwind theme (CSS variables in globals.css) for code that cannot
// use class names, such as deck.gl layers. The hex values live only in globals.css.

export type ColorToken =
  | "fire"
  | "fire-text"
  | "station"
  | "station-text"
  | "neutral"
  | "muted"
  | "ink"
  | "line-strong";

export type Rgb = [number, number, number];

/** "#f08a24" or "#fff" -> [240, 138, 36]. */
export function hexToRgb(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, "");
  const full = value.length === 3 ? [...value].map((char) => char + char).join("") : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: "${hex}"`);
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16)) as Rgb;
}

const cache = new Map<ColorToken, Rgb>();

/** The RGB value of a theme colour. Browser only. */
export function themeRgb(token: ColorToken): Rgb {
  let rgb = cache.get(token);
  if (!rgb) {
    rgb = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`));
    cache.set(token, rgb);
  }
  return rgb;
}

/** A theme colour with an opacity (0-1), as deck.gl wants it: [r, g, b, a] with a in 0-255. */
export function themeRgba(token: ColorToken, opacity = 1): [number, number, number, number] {
  return [...themeRgb(token), Math.round(255 * opacity)];
}

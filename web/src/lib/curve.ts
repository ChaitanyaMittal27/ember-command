/**
 * The curve entry for K stations, or undefined if the curve has none.
 * Curves are always looked up by `k`, never by array index: the fair curve starts at K = 6.
 */
export function curvePoint<T extends { k: number }>(curve: T[], k: number): T | undefined {
  return curve.find((point) => point.k === k);
}

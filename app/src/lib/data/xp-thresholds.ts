/** D&D 5e XP thresholds per level */
export const XP_THRESHOLDS: Record<number, number> = {
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
}

/** Get XP required for the next level */
export function getNextLevelXP(currentLevel: number): number | null {
  const nextLevel = currentLevel + 1
  return XP_THRESHOLDS[nextLevel] ?? null
}

/** Get XP required for current level (threshold that was crossed to reach this level) */
export function getCurrentLevelXP(currentLevel: number): number {
  return XP_THRESHOLDS[currentLevel] ?? 0
}

/** Calculate progress percentage toward next level */
export function getXPProgress(xp: number, currentLevel: number): number {
  const currentThreshold = getCurrentLevelXP(currentLevel)
  const nextThreshold = getNextLevelXP(currentLevel)
  if (!nextThreshold) return 100 // Max level
  if (xp >= nextThreshold) return 100 // Ready to level up
  const range = nextThreshold - currentThreshold
  const progress = xp - currentThreshold
  return Math.max(0, Math.min(100, (progress / range) * 100))
}

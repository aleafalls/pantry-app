export interface ChipColor {
  bg: string
  text: string
}

// Backgrounds are wrapped in an outer color-mix with transparent (75%
// color / 25% transparent) to knock opacity down ~25% without touching
// the (always-opaque) chip text color.
const MAIN_CHIP_BG = 'color-mix(in srgb, var(--yellow-light) 75%, transparent)'

const SIDE_CHIP_BACKGROUNDS = [
  'color-mix(in srgb, color-mix(in srgb, var(--teal) 25%, white) 75%, transparent)',
  'color-mix(in srgb, color-mix(in srgb, var(--red) 18%, white) 75%, transparent)',
  'color-mix(in srgb, color-mix(in srgb, var(--orange) 30%, white) 75%, transparent)',
]

/**
 * The main/hero ingredient always gets the yellow chip; supporting
 * ingredients cycle through the remaining palette in order. Text is always
 * `--foreground` regardless of background.
 */
export function getIngredientChipColors(ingredients: { is_main: boolean }[]): ChipColor[] {
  let sideIndex = 0
  return ingredients.map(ing => {
    if (ing.is_main) return { bg: MAIN_CHIP_BG, text: 'var(--foreground)' }
    const bg = SIDE_CHIP_BACKGROUNDS[sideIndex % SIDE_CHIP_BACKGROUNDS.length]
    sideIndex += 1
    return { bg, text: 'var(--foreground)' }
  })
}

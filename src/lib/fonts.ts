import { Inter, Playfair_Display } from 'next/font/google'

/**
 * Brand fonts for JR Realty.
 *
 * - Inter: UI / body text (variable)
 * - Playfair Display: elegant serif for headings (variable)
 *
 * Each `variable` exposes a CSS custom property on the element it is applied
 * to (--font-inter, --font-playfair). globals.css maps those to Tailwind's
 * `font-sans` and `font-heading` utilities via @theme inline.
 */
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
})

/**
 * Combined class helpers. Both variable classes are always included so either
 * font family is available to every descendant regardless of which helper is
 * used at the top of the tree.
 */
export const fontSans = `${inter.variable} ${playfair.variable} font-sans`
export const fontHeading = `${inter.variable} ${playfair.variable} font-heading`

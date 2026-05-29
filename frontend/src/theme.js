/**
 * Design tokens — single source of truth for fonts and palette.
 * Values mirror the CSS custom properties defined in index.css @theme.
 * Use these in JS/JSX instead of hard-coding strings.
 */

export const fonts = {
  sans: 'Hanken Grotesk',
  mono: 'JetBrains Mono',
};

/** Tailwind utility classes for fonts */
export const fontClass = {
  sans: 'font-sans',
  mono: 'font-mono',
};

/** CSS variable references (for inline styles when Tailwind classes aren't enough) */
export const cssVar = {
  fontSans: 'var(--font-sans)',
  fontMono: 'var(--font-mono)',
};

export const palette = {
  background: '#051424',
  surface: '#051424',
  surfaceDim: '#051424',
  surfaceBright: '#2c3a4c',
  surfaceContainerLowest: '#010f1f',
  surfaceContainerLow: '#0d1c2d',
  surfaceContainer: '#122131',
  surfaceContainerHigh: '#1c2b3c',
  surfaceContainerHighest: '#273647',
  surfaceVariant: '#273647',
  onBackground: '#d4e4fa',
  onSurface: '#d4e4fa',
  onSurfaceVariant: '#bbcac0',
  primary: '#5af0b3',
  primaryFixed: '#68fcbf',
  primaryFixedDim: '#45dfa4',
  primaryContainer: '#34d399',
  onPrimary: '#003825',
  onPrimaryContainer: '#00563b',
  inversePrimary: '#006c4b',
  secondary: '#bec6e0',
  secondaryContainer: '#3e465c',
  secondaryFixed: '#dae2fd',
  secondaryFixedDim: '#bec6e0',
  onSecondary: '#283044',
  onSecondaryContainer: '#adb5ce',
  tertiary: '#ccd7ef',
  tertiaryContainer: '#b0bbd2',
  onTertiary: '#263143',
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',
  outline: '#85948b',
  outlineVariant: '#3c4a42',
  inverseSurface: '#d4e4fa',
  inverseOnSurface: '#233143',
};

/** Reusable alpha variants */
export const alpha = {
  outline20: 'rgba(133, 148, 139, 0.2)',
  primaryBg10: 'rgba(90, 240, 179, 0.1)',
  secondaryBg10: 'rgba(190, 198, 224, 0.1)',
  primaryContainerBg10: 'rgba(52, 211, 153, 0.1)',
};

// typefaces.js — typeface registry and font-building utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Typeface registry: short display name → typeface descriptor.
 *
 * Each entry has:
 *   family        – CSS font-family stack string.
 *   styles        – map of style-name → { weight, fontStyle }.
 *   defaultStyle  – the style key used when no explicit style is specified.
 *
 * Used by buildFont() to produce a complete CSS font string for canvas
 * rendering (weight + font-style + size + family).
 */
export const TYPEFACES = {
  'Monospace': {
    family:       'monospace',
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Sans-serif': {
    family:       'sans-serif',
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Serif': {
    family:       'serif',
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Courier New': {
    family:       "'Courier New', Courier, monospace",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Helvetica': {
    family:       "'Helvetica Neue', Helvetica, Arial, sans-serif",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Helvetica Neue': {
    family:       "'Helvetica Neue', Helvetica, Arial, sans-serif",
    styles: {
      'Thin':        { weight: 100, fontStyle: 'normal'  },
      'Thin Italic': { weight: 100, fontStyle: 'italic'  },
      'Light':       { weight: 300, fontStyle: 'normal'  },
      'Light Italic':{ weight: 300, fontStyle: 'italic'  },
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Georgia': {
    family:       'Georgia, serif',
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Times New Roman': {
    family:       "'Times New Roman', Times, serif",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'System UI': {
    family:       "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Menlo': {
    family:       "Menlo, 'DejaVu Sans Mono', 'Lucida Console', monospace",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
};

/**
 * Build a CSS font string suitable for ctx.font from a typeface key, style
 * name, and size in pixels.
 *
 * @param {string} typefaceKey   – Key into TYPEFACES (e.g. 'Helvetica Neue').
 * @param {string} styleName     – Style key (e.g. 'Thin', 'Regular', 'Bold').
 *                                 Falls back to defaultStyle if not found.
 * @param {number} sizePx        – Font size in CSS pixels.
 * @returns {string}             – e.g. "italic 100 11px 'Helvetica Neue', Helvetica, sans-serif"
 */
export function buildFont(typefaceKey, styleName, sizePx) {
  const face = TYPEFACES[typefaceKey];
  if (!face) {
    // Unknown key — best-effort: treat key as a raw CSS family string.
    return `${sizePx}px ${typefaceKey}`;
  }
  const style = face.styles[styleName] ?? face.styles[face.defaultStyle];
  const parts = [];
  if (style.fontStyle && style.fontStyle !== 'normal') parts.push(style.fontStyle);
  if (style.weight    && style.weight    !== 400)      parts.push(style.weight);
  parts.push(`${sizePx}px`);
  parts.push(face.family);
  return parts.join(' ');
}

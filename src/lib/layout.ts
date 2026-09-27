import { normalizeAccount, normalizeWebsite, type CardFields, type LayoutId, type Orientation } from './model.ts'

export const CARD_FONT = '"Noto Sans CJK JP", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Arial, sans-serif'
export type MeasureText = (text: string, fontSize: number, weight: number, tracking: number) => number
export interface Box { x: number; y: number; width: number; height: number }
export interface TextSpec extends Box {
  id: keyof CardFields; text: string; fontSize: number; minFont: number
  weight: number; tracking: number; maxLines: number; align: 'left' | 'center'
}
export interface FittedText extends TextSpec {
  lines: string[]; sizes: number[]; font: number; overflow: boolean; lineHeight: number; firstBaseline: number
}
export type ContactKind = 'email' | 'website1' | 'website2' | 'github' | 'x'
type CoreField = 'name' | 'latinName' | 'role' | 'tagline'
type TextStyle = { x: number; width: number; height: number; fontSize: number; minFont: number; maxLines: number; weight?: number; tracking?: number }
type Item = { kind: 'text'; id: CoreField; height: number } | { kind: 'rule' | 'contacts'; height: number }
export interface CardLayout {
  texts: FittedText[]; main: Box; contactRule: { x: number; y: number; width: number }
  taglineRule: { x: number; y: number; width: number } | null
  contacts: Array<{ kind: ContactKind; x: number; y: number; size: number }>; illustrationOffsetY?: number
}
const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' })
export function graphemes(text: string): string[] { return [...segmenter.segment(text)].map(s => s.segment) }
/** The fallback is only for deterministic unit tests/SSR, never the browser preview. */
export const approximateMeasure: MeasureText = (text, size, weight, tracking) => {
  const chars = graphemes(text)
  return chars.reduce((sum, c) => sum + (/^[\x00-\x7F]$/.test(c) ? 0.56 : /^[\uFF61-\uFF9F]+$/.test(c) ? .5 : 1) * size * (weight >= 700 ? 1.02 : 1), 0)
    + Math.max(0, chars.length - 1) * tracking
}
export function createBrowserMeasure(): MeasureText {
  if (typeof document === 'undefined') return approximateMeasure
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return approximateMeasure
  return (text, size, weight, tracking) => {
    ctx.font = `${weight} ${size}px ${CARD_FONT}`
    ctx.fontKerning = 'none'
    return ctx.measureText(text).width + Math.max(0, graphemes(text).length - 1) * tracking
  }
}
/** Word-aware wrapping with grapheme-safe fallback for Japanese and long handles. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let remaining = graphemes(paragraph)
    if (remaining.length === 0) { lines.push(''); continue }
    while (remaining.length) {
      let end = 0
      while (end < remaining.length && measure(remaining.slice(0, end + 1).join('')) <= maxWidth + .01) end++
      if (end === 0) end = 1
      if (end < remaining.length) {
        let wordBreak = -1
        for (let i = 0; i <= end; i++) if (/\s/.test(remaining[i] ?? '')) wordBreak = i
        if (wordBreak > 0) end = wordBreak
      }
      lines.push(remaining.slice(0, end).join('').trimEnd())
      remaining = remaining.slice(end)
      while (remaining[0] === ' ') remaining.shift()
    }
  }
  return lines
}
export function fitText(spec: TextSpec, measure: MeasureText): FittedText {
  const text = spec.text.trim()
  if (!text) return { ...spec, lines: [], sizes: [], font: spec.fontSize, overflow: false, lineHeight: spec.fontSize * 1.22, firstBaseline: spec.y }
  let result: FittedText | null = null
  for (let font = spec.fontSize; font >= spec.minFont - .001; font -= .5) {
    const tracking = spec.tracking * font / spec.fontSize
    const m = (s: string) => measure(s, font, spec.weight, tracking)
    const lines = wrapText(text, spec.width, m)
    const lineHeight = font * 1.22
    const blockHeight = font + (lines.length - 1) * lineHeight
    const overflow = lines.length > spec.maxLines || blockHeight > spec.height + .01 || lines.some(s => m(s) > spec.width + .01)
    result = { ...spec, tracking, lines, sizes: lines.map(m), font, overflow, lineHeight,
      firstBaseline: spec.y + Math.max(0, (spec.height - blockHeight) / 2) + font * .86 }
    if (!overflow) return result
  }
  return result!
}
export function computeLayout(fields: CardFields, layout: LayoutId, measure: MeasureText, orientation: Orientation = 'landscape'): CardLayout {
    const portrait = orientation === 'portrait';
    const center = portrait || layout === 'center';
    const x = layout === 'right' ? 359 : 112;
    const normalized: Array<{ kind: ContactKind; text: string }> = [
        { kind: 'email' as const, text: fields.email.trim() },
        { kind: 'website1' as const, text: normalizeWebsite(fields.website1) },
        { kind: 'website2' as const, text: normalizeWebsite(fields.website2) },
        { kind: 'github' as const, text: normalizeAccount(fields.github, 'github') },
        { kind: 'x' as const, text: normalizeAccount(fields.x, 'x') },
    ].filter(contact => contact.text);
    const contactCount = normalized.length;
    const contactHeight = portrait ? 32 : center
        ? contactCount >= 5 ? 20 : contactCount === 4 ? 23 : contactCount >= 3 ? 28 : 32
        : contactCount >= 5 ? 24 : contactCount === 4 ? 28 : 34;
    const contactGap = portrait ? 8 : center
        ? contactCount >= 5 ? 1 : contactCount === 4 ? 2 : contactCount >= 3 ? 4 : 8
        : contactCount >= 5 ? 3 : contactCount === 4 ? 4 : 10;
    const contactIconSize = portrait ? 25 : center
        ? contactCount >= 5 ? 18 : contactCount === 4 ? 20 : 27
        : contactCount >= 5 ? 20 : contactCount === 4 ? 22 : 27;
    const common = { weight: 400, tracking: .3, align: center ? 'center' : 'left' } as const;
    const spec = (id: keyof CardFields, box: Box, fontSize: number, minFont: number, maxLines = 1, extra: Partial<TextSpec> = {}): TextSpec => ({ ...common, ...box, id, text: fields[id], fontSize, minFont, maxLines, ...extra });
    const styles: Record<CoreField, TextStyle> = portrait ? {
        name: { x: 55, width: 440, height: 96, fontSize: 60, minFont: 30, maxLines: 2, weight: 700, tracking: 2 },
        latinName: { x: 55, width: 440, height: 34, fontSize: 27, minFont: 15, maxLines: 1, tracking: 1.8 },
        role: { x: 55, width: 440, height: 58, fontSize: 25, minFont: 16, maxLines: 2 },
        tagline: { x: 65, width: 420, height: 50, fontSize: 18.5, minFont: 12, maxLines: 2, tracking: .6 },
    } : center ? {
        name: { x: 142, width: 626, height: 80, fontSize: 64, minFont: 31, maxLines: 2, weight: 700, tracking: 2 },
        latinName: { x: 152, width: 606, height: 34, fontSize: 27, minFont: 15, maxLines: 1, tracking: 1.8 },
        role: { x: 138, width: 634, height: 52, fontSize: 25, minFont: 16, maxLines: 2 },
        tagline: { x: 230, width: 450, height: 38, fontSize: 15.5, minFont: 12, maxLines: 2, tracking: .6 },
    } : {
        tagline: { x: x + 66, width: 367, height: 51, fontSize: 18.5, minFont: 13, maxLines: 2, tracking: 1 },
        name: { x: x - 3, width: 437, height: 97, fontSize: 76, minFont: 32, maxLines: 2, weight: 700, tracking: 2 },
        latinName: { x, width: 436, height: 35, fontSize: 28.5, minFont: 17, maxLines: 1, tracking: 1.6 },
        role: { x, width: 436, height: 55, fontSize: 25.5, minFont: 16, maxLines: 2, tracking: .3 },
    };
    const fieldOrder: CoreField[] = center ? ['name', 'latinName', 'role'] : ['tagline', 'name', 'latinName', 'role'];
    const items: Item[] = fieldOrder.filter(id => fields[id].trim()).map(id => ({ kind: 'text', id, height: styles[id].height }));
    if (normalized.length) {
        items.push({ kind: 'rule', height: 3 });
        items.push({ kind: 'contacts', height: normalized.length * contactHeight + (normalized.length - 1) * contactGap });
    }
    if (center && fields.tagline.trim())
        items.push({ kind: 'text', id: 'tagline', height: styles.tagline.height });
    const gapBetween = (previous: Item, next: Item): number => {
        if (previous.kind === 'text' && next.kind === 'text') {
            if (previous.id === 'name' && next.id === 'latinName')
                return center ? 6 : 4;
            if (previous.id === 'latinName' && next.id === 'role')
                return center ? 10 : 12;
            if (previous.id === 'tagline')
                return 24;
            if (previous.id === 'name')
                return 12;
            return 18;
        }
        if (previous.kind === 'text' && next.kind === 'rule')
            return previous.id === 'role' ? 9 : 16;
        if (previous.kind === 'rule' && next.kind === 'contacts')
            return center ? 8 : 12;
        if (previous.kind === 'contacts' && next.kind === 'text')
            return 14;
        return 0;
    };
    const contentTop = portrait ? 330 : center ? 170 : 64;
    const contentBottom = portrait ? 870 : 530;
    const totalHeight = items.reduce((sum, item, index) => sum + item.height + (index ? gapBetween(items[index - 1], item) : 0), 0);
    const freeSpace = Math.max(0, (contentBottom - contentTop - totalHeight) / 2);
    // Keep art and text together, then center the complete portrait composition.
    const illustrationOffsetY = portrait ? Math.max(0, (910 - (contentTop + totalHeight + 42)) / 2) : 0;
    let cursor = contentTop + (portrait ? illustrationOffsetY : freeSpace);
    let contactRuleY = cursor;
    let taglineRule: CardLayout['taglineRule'] = null;
    const texts: TextSpec[] = [];
    const contacts: CardLayout['contacts'] = [];
    items.forEach((item, index) => {
        if (index)
            cursor += gapBetween(items[index - 1], item);
        if (item.kind === 'text') {
            const style = styles[item.id];
            const textSpec = spec(item.id, { x: style.x, y: cursor, width: style.width, height: style.height }, style.fontSize, style.minFont, style.maxLines, { weight: style.weight ?? 400, tracking: style.tracking ?? .3 });
            texts.push(textSpec);
            if (item.id === 'tagline' && !center)
                taglineRule = { x, y: cursor + 16, width: 50 };
            cursor += item.height;
            return;
        }
        if (item.kind === 'rule') {
            contactRuleY = cursor;
            cursor += item.height;
            return;
        }
        normalized.forEach(({ kind, text }, contactIndex) => {
            const y = cursor + contactIndex * (contactHeight + contactGap);
            const box = portrait ? { x: 96, y, width: 399, height: contactHeight } : center ? { x: 294, y, width: 353, height: contactHeight } : { x: x + 55, y, width: 379, height: contactHeight };
            const email = kind === 'email';
            const website = kind === 'website1' || kind === 'website2';
            const accountText = kind === 'x' ? '@' + text : text;
            const compact = !portrait && contactCount >= 4;
            const fontSize = email
                ? center ? compact ? 16 : 19 : compact ? 18 : 22
                : center ? compact ? 18 : 24 : compact ? 21 : 26.5;
            const minFont = email ? 11 : website ? 12 : 16;
            const iconTextOffset = contactIconSize + (center ? 16 : 28);
            const fitted = fitText(spec(kind, box, fontSize, minFont, 1, { text: accountText, align: 'left' }), measure);
            if (center && !portrait)
                fitted.x = 455 - ((fitted.sizes[0] ?? 0) + iconTextOffset) / 2 + iconTextOffset;
            contacts.push({ kind, x: fitted.x - (center ? iconTextOffset : 55), y: y + (contactHeight - contactIconSize) / 2 - 1, size: contactIconSize });
            texts.push({ ...fitted, fontSize: fitted.font });
        });
        cursor += item.height;
    });
    const fittedTexts = texts.map(text => fitText(text, measure));
    if (portrait && contacts.length) {
        const contactTexts = fittedTexts.filter(text => contacts.some(contact => contact.kind === text.id));
        const textWidth = Math.max(...contactTexts.map(text => Math.min(text.width, Math.max(...text.sizes))));
        const iconTextOffset = contactIconSize + 16;
        const left = (550 - textWidth - iconTextOffset) / 2;
        contacts.forEach(contact => { contact.x = left; });
        contactTexts.forEach(text => { text.x = left + iconTextOffset; });
    }
    return {
        texts: fittedTexts, contacts,
        ...(portrait ? { illustrationOffsetY } : {}),
        main: portrait ? { x: 160, y: 66 + illustrationOffsetY, width: 230, height: 228 } : center ? { x: 383, y: 21, width: 144, height: 143 } : layout === 'right' ? { x: 61, y: 181, width: 251, height: 249 } : { x: 595, y: 181, width: 251, height: 249 },
        contactRule: { x: portrait ? 249 : center ? 430 : x, y: contactRuleY, width: 52 },
        taglineRule: center ? null : taglineRule,
    };
}

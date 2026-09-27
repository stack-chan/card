export const STORAGE_KEY = 'stackchan-card-studio:v1'
export const PAPER = { width: 91, height: 55, bleed: 3, unitsPerMm: 10 } as const
export type Orientation = 'landscape' | 'portrait'
export function getPaperGeometry(orientation: Orientation = 'landscape', bleed = false) {
  const portrait = orientation === 'portrait'
  const trimWidth = portrait ? PAPER.height : PAPER.width
  const trimHeight = portrait ? PAPER.width : PAPER.height
  const margin = bleed ? PAPER.bleed : 0
  const width = trimWidth + margin * 2
  const height = trimHeight + margin * 2
  const units = PAPER.unitsPerMm
  return { trimWidth, trimHeight, width, height,
    trimWidthUnits: trimWidth * units, trimHeightUnits: trimHeight * units,
    viewBox: `${-margin * units} ${-margin * units} ${width * units} ${height * units}` }
}
export const BACKGROUNDS = [
  { id: 'scatter', name: '仲間たち', description: 'いつものｽﾀｯｸﾁｬﾝを、散りばめて。' },
  { id: 'blueprint', name: '設計図', description: '細い方眼と、ものづくりの空気感。' },
  { id: 'dots', name: 'ドット', description: '小さなドットで、軽やかに。' },
  { id: 'soft', name: 'やわらか', description: '淡い色と丸いかたち。' },
  { id: 'stripe', name: 'ストライプ', description: '斜めのラインを、さりげなく。' },
  { id: 'plain', name: 'シンプル', description: '余白と一体のｽﾀｯｸﾁｬﾝだけ。' },
] as const
export type BackgroundId = (typeof BACKGROUNDS)[number]['id']
export const LAYOUTS = [
  { id: 'left', name: '文字を左に' },
  { id: 'right', name: '文字を右に' },
  { id: 'center', name: '中央揃え' },
] as const
export type LayoutId = (typeof LAYOUTS)[number]['id']
export const ACCENTS = [
  { color: '#F47721', name: 'オレンジ' },
  { color: '#168577', name: 'ティール' },
  { color: '#396BD8', name: 'ブルー' },
  { color: '#BD5477', name: 'ローズ' },
  { color: '#42474E', name: 'グラファイト' },
] as const
export interface CardFields {
  name: string
  latinName: string
  role: string
  tagline: string
  email: string
  website1: string
  website2: string
  github: string
  x: string
}
export interface CardDesign {
  background: BackgroundId
  layout: LayoutId
  orientation: Orientation
  accent: string
  patternOpacity: number
}
export interface CardDraft { version: 1; fields: CardFields; design: CardDesign }
export const DEFAULT_DRAFT: CardDraft = {
  version: 1,
  fields: {
    name: 'ししかわ', latinName: 'Shinya Ishikawa',
    role: 'ｽﾀｯｸﾁｬﾝコミュニティ代表',
    tagline: 'Communication Robots\nin Your Hand',
    email: '', website1: '', website2: '',
    github: 'meganetaaan', x: 'meganetaaan',
  },
  design: { background: 'scatter', layout: 'left', orientation: 'landscape', accent: '#F47721', patternOpacity: 85 },
}
export const FIELD_LIMITS: Record<keyof CardFields, number> = {
  name: 60, latinName: 100, role: 140, tagline: 180, email: 254, website1: 2048, website2: 2048, github: 80, x: 80,
}
export const FIELD_LABELS: Record<keyof CardFields, string> = {
  name: '名前', latinName: '英字表記', role: '肩書き', tagline: 'フレーズ', email: 'メールアドレス', website1: 'Webサイト 1', website2: 'Webサイト 2', github: 'GitHub', x: 'X',
}
/** Strip control characters, not markup: React/SVG serializers handle escaping. */
export function cleanField(value: string, field: keyof CardFields): string {
  let text = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  if (field !== 'role' && field !== 'tagline') text = text.replace(/[\r\n]+/g, ' ')
  return [...text].slice(0, FIELD_LIMITS[field]).join('')
}
export function normalizeAccount(value: string, service: 'github' | 'x'): string {
  let text = value.trim()
  const host = service === 'github' ? '(?:www\\.)?github\\.com' : '(?:www\\.)?(?:x|twitter)\\.com'
  text = text.replace(new RegExp(`^(?:https?:\\/\\/)?${host}\\/`, 'i'), '')
  return text.replace(/^@+/, '').split(/[/?#\s]/)[0] ?? ''
}
/** Keep URLs compact on the printed card while preserving the full value in the draft. */
export function normalizeWebsite(value: string): string {
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}
export function restoreDraft(input: unknown): CardDraft {
  const fallback: CardDraft = structuredClone(DEFAULT_DRAFT)
  if (!input || typeof input !== 'object') return fallback
  const source = input as Record<string, unknown>
  if (source.version !== 1) return fallback
  if (source.fields && typeof source.fields === 'object') {
    const fields = source.fields as Record<string, unknown>
    for (const key of Object.keys(fallback.fields) as Array<keyof CardFields>) {
      if (typeof fields[key] === 'string') fallback.fields[key] = cleanField(fields[key], key)
    }
  }
  if (source.design && typeof source.design === 'object') {
    const d = source.design as Record<string, unknown>
    if (d.orientation === 'landscape' || d.orientation === 'portrait') fallback.design.orientation = d.orientation
    if (BACKGROUNDS.some(b => b.id === d.background)) fallback.design.background = d.background as BackgroundId
    if (LAYOUTS.some(l => l.id === d.layout)) fallback.design.layout = d.layout as LayoutId
    if (typeof d.accent === 'string' && /^#[\da-f]{6}$/i.test(d.accent)) fallback.design.accent = d.accent
    if (typeof d.patternOpacity === 'number' && Number.isFinite(d.patternOpacity))
      fallback.design.patternOpacity = Math.max(15, Math.min(100, d.patternOpacity))
  }
  return fallback
}
export function loadDraft(): CardDraft {
  try { return restoreDraft(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) }
  catch { return structuredClone(DEFAULT_DRAFT) }
}
export function mixWithWhite(hex: string, strength: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const t = Math.max(0, Math.min(1, strength))
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map(c => Math.round(255 + (c - 255) * t).toString(16).padStart(2, '0')).join('')}`
}

import * as React from 'react'
import { CARD_FONT, type CardLayout, type FittedText } from '@/lib/layout'
import { getPaperGeometry, PAPER, type CardDraft } from '@/lib/model'
import { Background } from './Background'
import { ROBOTS } from './robotAssets'
import { BrandIcon } from './BrandIcon'
import { ThoughtBubble } from './ThoughtBubble'

function TextBlock({ fitted: f, color, prefix }: { fitted: FittedText; color: string; prefix: string }) {
  if (!f.lines.length) return null
  const clipId = `${prefix}-${f.id}-clip`
  return <g data-field={f.id} data-font-size={f.font} data-overflow={f.overflow ? 'true' : 'false'}>
    {f.overflow && <defs><clipPath id={clipId}><rect x={f.x} y={f.y} width={f.width} height={f.height} /></clipPath></defs>}
    <g clipPath={f.overflow ? `url(#${clipId})` : undefined}>
      {f.lines.map((line, i) => <text key={i} x={f.align === 'center' ? f.x + f.width / 2 : f.x} y={f.firstBaseline + i * f.lineHeight}
        textAnchor={f.align === 'center' ? 'middle' : 'start'}
        fontFamily={CARD_FONT} fontSize={f.font} fontWeight={f.weight}
        letterSpacing={f.tracking} style={{ fontKerning: 'none', fontVariantLigatures: 'none' }} fill={color}>{line}</text>)}
    </g>
  </g>
}
export interface CardSvgProps { draft: CardDraft; layout: CardLayout; bleed?: boolean; guides?: boolean; className?: string; avatar?: string }
export const CardSvg = React.forwardRef<SVGSVGElement, CardSvgProps>(function CardSvg({ draft, layout, bleed = false, guides = false, className, avatar = '' }, ref) {
  const prefix = `card-${React.useId().replace(/:/g, '')}`
  const { design, fields } = draft
  const portrait = design.orientation === 'portrait'
  const paper = getPaperGeometry(design.orientation, bleed)
  const { contactRule, taglineRule } = layout
  const main = !avatar ? layout.main : portrait
    ? { x:247, y:111 + (layout.illustrationOffsetY ?? 0), width:200, height:198 }
    : design.layout === 'center'
      ? { x:454, y:34, width:125, height:124 }
      : { x:design.layout === 'right' ? 68 : 606, y:244, width:235, height:233 }
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={`${paper.width}mm`} height={`${paper.height}mm`}
    viewBox={paper.viewBox} className={className} role="img" aria-labelledby={`${prefix}-title`}>
    <title id={`${prefix}-title`}>{fields.name || '未入力'}の名刺プレビュー</title>
    <desc>{`${paper.trimWidth} × ${paper.trimHeight} mm。ｽﾀｯｸﾁｬﾝのイラストを使ったOSS名刺。`}</desc>
    <metadata>{JSON.stringify({ ...draft, trim_mm: [paper.trimWidth, paper.trimHeight], bleed_mm: bleed ? PAPER.bleed : 0, color: 'sRGB', text: 'editable; local fonts; not outlined' })}</metadata>
    <Background design={design} prefix={prefix} />
    <image data-main-robot="true" href={ROBOTS.main} x={main.x} y={main.y} width={main.width} height={main.height} preserveAspectRatio="xMidYMid meet" />
    <ThoughtBubble avatar={avatar} layout={design.layout} orientation={design.orientation} offsetY={layout.illustrationOffsetY} prefix={prefix} />
    {fields.tagline.trim() && taglineRule && <rect {...taglineRule} height="3" fill={design.accent} />}
    {layout.contacts.length > 0 && <rect {...contactRule} height="2.7" fill={design.accent} />}
    {layout.texts.map(f => <TextBlock key={f.id} fitted={f} color={f.id === 'tagline' ? '#646664' : '#252825'} prefix={prefix} />)}
    {layout.contacts.map(c => <BrandIcon key={c.kind} {...c} color={design.accent} />)}
    {guides && <g data-guide="true" fill="none" strokeWidth="1.2" pointerEvents="none">
      <rect x=".6" y=".6" width={paper.trimWidthUnits - 1.2} height={paper.trimHeightUnits - 1.2} stroke="#e66d39" strokeDasharray="7 5" />
      <rect x="30" y="30" width={paper.trimWidthUnits - 60} height={paper.trimHeightUnits - 60} stroke="#1e9b8a" strokeDasharray="6 5" />
    </g>}
  </svg>
})

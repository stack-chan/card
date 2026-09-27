import * as React from 'react'
import { BACKGROUNDS, LAYOUTS, ACCENTS, DEFAULT_DRAFT, getPaperGeometry, type BackgroundId, type CardDesign, type Orientation } from '@/lib/model'
import { approximateMeasure, computeLayout } from '@/lib/layout'
import { Background } from '@/components/card/Background'
import { ROBOTS } from '@/components/card/robotAssets'
import { Icon } from '@/components/icons'

export function BackgroundThumbnail({ design, background }: { design: CardDesign; background: BackgroundId }) {
  const prefix = `thumb-${React.useId().replace(/:/g, '')}`
  const paper = getPaperGeometry(design.orientation)
  if (design.orientation === 'portrait') {
    const layout = computeLayout(DEFAULT_DRAFT.fields, 'center', approximateMeasure, 'portrait')
    const rowY = (id: 'name' | 'latinName' | 'role' | 'github') => {
      const text = layout.texts.find(text => text.id === id)!
      return text.y + text.height / 2
    }
    return <svg viewBox={paper.viewBox} aria-hidden="true" className="background-thumb">
      <Background design={{ ...design, background }} prefix={prefix} />
      <image href={ROBOTS.main} {...layout.main} />
      <rect x={140} y={rowY('name') - 12.5} width={270} height={25} rx={3} fill="#505050" />
      <rect x={175} y={rowY('latinName') - 5} width={200} height={10} rx={2} fill="#b0b0b0" />
      <rect x={165} y={rowY('role') - 5} width={220} height={10} rx={2} fill="#b0b0b0" />
      <rect x={190} y={rowY('github') - 4.5} width={170} height={9} rx={2} fill={design.accent} />
    </svg>
  }
  return <svg viewBox={paper.viewBox} aria-hidden="true" className="background-thumb">
    <Background design={{ ...design, background, layout: 'left' }} prefix={prefix} />
    <rect x="120" y="220" width="300" height="25" rx="3" fill="#505050" />
    <rect x="120" y="269" width="210" height="10" rx="2" fill="#b0b0b0" />
    <rect x="120" y="335" width="235" height="10" rx="2" fill="#b0b0b0" />
    <rect x="120" y="403" width="157" height="9" rx="2" fill={design.accent} />
    <image href={ROBOTS.main} x="586" y="172" width="250" height="248" />
  </svg>
}
export function OrientationPicker({ design, onChange }: { design: CardDesign; onChange: (patch: Partial<CardDesign>) => void }) {
  const instance = React.useId()
  return <fieldset className="orientation-picker">
    <legend>名刺の向き</legend>
    <div className="segmented-control">
      {([['landscape', '横'], ['portrait', '縦']] as Array<[Orientation, string]>).map(([value, label]) =>
        <label key={value} className={`segment ${design.orientation === value ? 'selected' : ''}`}>
          <input type="radio" className="sr-only" name={`orientation-${instance}`} value={value}
            checked={design.orientation === value} onChange={() => onChange({ orientation: value })} />
          <Icon name={value} size={17} />{label}
        </label>)}
    </div>
  </fieldset>
}
export function BackgroundPicker({ design, onChange }: { design: CardDesign; onChange: (patch: Partial<CardDesign>) => void }) {
  const instance = React.useId()
  return <div className="background-picker" role="group" aria-label="背景パターン">
    {BACKGROUNDS.map(bg => <label className={`background-choice has-tooltip ${design.background === bg.id ? 'selected' : ''}`} key={bg.id}>
      <input className="sr-only" type="radio" name={`background-${instance}`} value={bg.id} checked={design.background === bg.id} onChange={() => onChange({ background: bg.id })} aria-label={bg.name} />
      <BackgroundThumbnail design={design} background={bg.id} />
      <span className="tooltip">{bg.name}</span>
    </label>)}
  </div>
}
export function DesignPanel({ design, onChange }: { design: CardDesign; onChange: (patch: Partial<CardDesign>) => void }) {
  const instance = React.useId()
  return <div className="design-panel">
    {design.orientation !== 'portrait' && <fieldset><legend>配置</legend><div className="segmented-control">
      {LAYOUTS.map(l => <label className={`segment has-tooltip ${design.layout === l.id ? 'selected' : ''}`} key={l.id}>
        <input type="radio" className="sr-only" name={`layout-${instance}`} checked={design.layout === l.id} onChange={() => onChange({ layout: l.id })} aria-label={l.name} />
        <Icon name={l.id === 'left' ? 'alignLeft' : l.id === 'right' ? 'alignRight' : 'alignCenter'} size={17} /><span className="tooltip">{l.name}</span>
      </label>)}
    </div></fieldset>}
    <fieldset><legend>色</legend><div className="color-options">
      {ACCENTS.map(a => <label className={`color-choice has-tooltip ${design.accent.toLowerCase() === a.color.toLowerCase() ? 'selected' : ''}`} key={a.color} style={{ '--swatch': a.color } as React.CSSProperties}>
        <input type="radio" className="sr-only" name={`accent-${instance}`} checked={design.accent.toLowerCase() === a.color.toLowerCase()} onChange={() => onChange({ accent: a.color })} aria-label={a.name} />
        <span className="swatch">{design.accent.toLowerCase() === a.color.toLowerCase() && <Icon name="check" size={15} />}</span><span className="tooltip">{a.name}</span>
      </label>)}
    </div></fieldset>
    <div className="opacity-field"><label htmlFor="pattern-opacity">柄の濃さ <output htmlFor="pattern-opacity">{design.patternOpacity}%</output></label>
      <input type="range" id="pattern-opacity" min="15" max="100" step="5" value={design.patternOpacity} disabled={design.background === 'plain'} onChange={e => onChange({ patternOpacity: Number(e.target.value) })} />
    </div>
  </div>
}

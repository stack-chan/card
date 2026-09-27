import * as React from 'react'
import type { CardDesign } from '@/lib/model'
import { getPaperGeometry, mixWithWhite } from '@/lib/model'
import { ROBOTS, type RobotId } from './robotAssets'

const MOTIFS: Array<[RobotId, number, number, number, number]> = [
  ['happy', 15, 14, 83, 77], ['wink', -42, 120, 85, 74],
  ['wink', 563, 38, 84, 74], ['neutralTop', 672, -16, 106, 74],
  ['squint', 828, 74, 90, 78], ['sleep', 777, 159, 88, 72],
  ['playful', 847, 275, 88, 85], ['heart', -28, 337, 85, 78],
  ['heart', 27, 474, 85, 78], ['sleepBottom', 575, 474, 100, 89],
  ['neutral', 788, 450, 88, 75],
]
const PORTRAIT_MOTIFS: Array<[RobotId, number, number, number, number]> = [
  ['happy', 8, 14, 66, 62], ['wink', -18, 210, 72, 64],
  ['squint', 472, 18, 72, 63], ['neutralTop', 495, 286, 92, 64],
  ['heart', -24, 452, 77, 70], ['sleep', 497, 568, 78, 64],
  ['playful', -22, 711, 76, 74], ['sleepBottom', 81, 852, 88, 78],
  ['neutral', 470, 852, 80, 68],
]
function Motifs({ design, sparse = false }: { design: CardDesign; sparse?: boolean }) {
  const portrait = design.orientation === 'portrait'
  const source = portrait ? PORTRAIT_MOTIFS : MOTIFS
  let motifs = sparse ? source.filter((_, i) => (portrait ? [0, 2, 4, 6, 8] : [0, 3, 4, 8, 10]).includes(i)) : source
  if (!portrait && design.layout === 'center') motifs = motifs.filter((_, i) => ![2, 9].includes(i))
  return <g opacity={design.patternOpacity / 100}>
    {motifs.map(([id, x, y, width, height], i) => <image key={i} href={ROBOTS[id]} x={!portrait && design.layout === 'right' ? 910 - x - width : x} y={y} width={width} height={height} preserveAspectRatio="xMidYMid meet" />)}
  </g>
}
export function Background({ design, prefix }: { design: CardDesign; prefix: string }) {
  const { background, accent } = design
  const portrait = design.orientation === 'portrait'
  const paper = getPaperGeometry(design.orientation, true)
  const full = { x: -30, y: -30, width: paper.width * 10, height: paper.height * 10 }
  const dotsPath = portrait ? 'M-30-30H580V67Q420 15 275 48T-30 75ZM-30 880Q115 849 275 882T580 870V940H-30Z' : 'M-30-30H940V110Q652 12 575 54T-30 120ZM-30 449Q190 532 450 481T940 458V580H-30Z'
  const soft = mixWithWhite(accent, .10)
  const faint = mixWithWhite(accent, .045)
  const isRight = !portrait && design.layout === 'right'
  return <g data-background={background}>
    <rect {...full} fill="#ffffff" />
    <defs>
      <pattern id={`${prefix}-grid`} width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke={accent} strokeWidth=".6" /></pattern>
      <pattern id={`${prefix}-dots`} width="27" height="27" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.45" fill={accent} /></pattern>
      <pattern id={`${prefix}-stripes`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M0 0V16" stroke={accent} strokeWidth="1.4" /></pattern>
    </defs>
    {background === 'scatter' && <Motifs design={design} />}
    {background === 'blueprint' && <>
      <rect {...full} fill={faint} />
      <rect {...full} fill={`url(#${prefix}-grid)`} opacity={design.patternOpacity / 450} />
      <path d={portrait ? 'M-30 132H38M512 782H580M48-30V98M505 816V940' : 'M-30 132H90M826 422H940M56-30V98M869 446V580'} fill="none" stroke={accent} strokeWidth="1.1" opacity=".28" />
      {(portrait ? [[28, 131], [522, 781], [505, 92], [28, 842]] : [[55, 131], [869, 421], [854, 92], [48, 482]]).map(([x, y], i) => <g key={i} stroke={accent} opacity=".38"><path d={`M${x - 6} ${y}h12m-6-6v12`} /></g>)}
      <Motifs design={design} sparse />
    </>}
    {background === 'dots' && <>
      <path d={dotsPath} fill={faint} />
      <path d={dotsPath} fill={`url(#${prefix}-dots)`} opacity={design.patternOpacity / 200} />
      <Motifs design={design} sparse />
    </>}
    {background === 'soft' && <>
      <g opacity={design.patternOpacity / 100} transform={isRight ? 'translate(910 0) scale(-1 1)' : undefined}>
        <ellipse cx="24" cy="39" rx={portrait ? 85 : 143} ry="98" fill={soft} />
        <ellipse cx={portrait ? 537 : 872} cy={portrait ? 907 : 527} rx={portrait ? 180 : 285} ry={portrait ? 60 : 110} fill={soft} />
        <ellipse cx={portrait ? 537 : 847} cy="-3" rx={portrait ? 78 : 123} ry="110" fill="#F8F1D9" />
        <circle cx={portrait ? 8 : 33} cy={portrait ? 745 : 405} r={portrait ? 27 : 35} fill="#F5E7E4" />
        <circle cx={portrait ? 330 : 644} cy="34" r="22" fill={faint} />
      </g>
      <Motifs design={design} sparse />
    </>}
    {background === 'stripe' && <>
      <g opacity={design.patternOpacity / 100}>
        <path d={portrait ? 'M380-30H580V85L510 127ZM-30 858 159 920 77 940H-30Z' : 'M530-30H940V64L831 157ZM-30 446 159 503 77 580H-30Z'} fill={soft} />
        <path d={portrait ? 'M414-30H580V94L531 128ZM-30 867 155 927 103 940H-30Z' : 'M584-30H940V84L861 148ZM-30 437 155 507 103 580H-30Z'} fill={`url(#${prefix}-stripes)`} opacity=".36" />
        <path d={portrait ? 'm429-30 151 105M-30 893l152 47' : 'm759-30 181 105M-30 493l182 57'} stroke={accent} strokeWidth="5" opacity=".6" />
      </g>
      <Motifs design={design} sparse />
    </>}
  </g>
}

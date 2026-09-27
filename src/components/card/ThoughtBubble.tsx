import * as React from 'react'
import type { LayoutId, Orientation } from '@/lib/model'

export function ThoughtBubble({ avatar, layout, orientation = 'landscape', offsetY = 0, prefix }: {
  avatar: string; layout: LayoutId; orientation?: Orientation; offsetY?: number; prefix: string
}) {
  if (!avatar) return null
  const portrait = orientation === 'portrait'
  const center = layout === 'center'
  const x = portrait ? 110 : center ? 326 : layout === 'right' ? 94 : 642
  const y = portrait ? 42 + offsetY : center ? 12 : 56
  const size = portrait ? 150 : center ? 112 : 174
  const radius = size/2
  const dots = portrait ? [[247,190 + offsetY,8],[263,210 + offsetY,4]] : center ? [[443,100,7],[452,113,4]] : [[x+118,236,9],[x+125,252,5]]
  const clip = `${prefix}-avatar-clip`
  return <g data-avatar-bubble="true">
    <defs><clipPath id={clip}><circle cx={x+radius} cy={y+radius} r={radius-9} /></clipPath></defs>
    {dots.map(([cx,cy,r],i) => <circle key={i} cx={cx} cy={cy} r={r} fill="#fff" stroke="#c9ceca" strokeWidth={1.8} />)}
    <circle cx={x+radius} cy={y+radius} r={radius} fill="#fff" stroke="#c9ceca" strokeWidth={2} />
    <image href={avatar} x={x+9} y={y+9} width={size-18} height={size-18} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
  </g>
}

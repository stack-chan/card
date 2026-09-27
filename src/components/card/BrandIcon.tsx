import * as React from 'react'
import type { ContactKind } from '@/lib/layout'
// SVG paths carried forward from the previous card; see THIRD-PARTY-NOTICES.txt.
const PATHS = {
  github: 'M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943',
  x: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
}
export function BrandIcon({ kind, x = 0, y = 0, size = 27, color = 'currentColor' }: {
  kind: ContactKind; x?: number; y?: number; size?: number; color?: string
}) {
  const transform = `translate(${x} ${y}) scale(${size / 24})`
  if (kind === 'email') return <g transform={transform} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="m3.5 6 8.5 6.5L20.5 6" />
  </g>
  if (kind === 'website1' || kind === 'website2') return <g transform={transform} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5c2.5 2.6 3.75 5.75 3.75 9.5S14.5 18.9 12 21.5M12 2.5C9.5 5.1 8.25 8.25 8.25 12s1.25 6.9 3.75 9.5" />
  </g>
  return <g transform={transform} fill={color} aria-hidden="true"><path d={PATHS[kind]} /></g>
}

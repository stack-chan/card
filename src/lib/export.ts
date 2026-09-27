import { setPngDpi } from './png.ts'
import { getPaperGeometry, PAPER, type Orientation } from './model.ts'

export type ExportFormat = 'svg' | 'png' | 'print'
const imageCache = new Map<string, Promise<string>>()
async function asDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  if (!imageCache.has(url)) {
    const task = (async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('イラストを読み込めませんでした。再読み込みしてください。')
      const blob = await response.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('画像データの変換に失敗しました。'))
        reader.readAsDataURL(blob)
      })
    })().catch(error => { imageCache.delete(url); throw error })
    imageCache.set(url, task)
  }
  return imageCache.get(url)!
}
/** Clone first so edits made while exporting cannot change the captured card. */
export async function prepareSvg(source: SVGSVGElement, bleed: boolean, orientation: Orientation = 'landscape'): Promise<SVGSVGElement> {
  const paper = getPaperGeometry(orientation, bleed)
  const clone = source.cloneNode(true) as SVGSVGElement
  clone.removeAttribute('class')
  clone.removeAttribute('style')
  clone.setAttribute('width', `${paper.width}mm`)
  clone.setAttribute('height', `${paper.height}mm`)
  clone.setAttribute('viewBox', paper.viewBox)
  clone.querySelectorAll('[data-guide]').forEach(n => n.remove())
  const metadata = clone.querySelector('metadata')
  if (metadata?.textContent) {
    try { metadata.textContent = JSON.stringify({ ...JSON.parse(metadata.textContent), trim_mm: [paper.trimWidth, paper.trimHeight], bleed_mm: bleed ? PAPER.bleed : 0 }) } catch { /* Optional metadata does not affect art. */ }
  }
  await Promise.all([...clone.querySelectorAll('image')].map(async image => {
    const href = image.getAttribute('href') || image.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
    if (href) image.setAttribute('href', await asDataUrl(href))
    image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href')
  }))
  return clone
}
function serialize(svg: SVGSVGElement): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg)
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = name
  document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
function safeFileName(name: string) {
  return (name.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/[.\s]+$/, '') || 'stackchan') + '-card'
}
async function imageFromSvg(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([serialize(svg)], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally { URL.revokeObjectURL(url) }
}
export async function exportCard(source: SVGSVGElement, format: ExportFormat, bleed: boolean, name: string, orientation: Orientation = 'landscape'): Promise<void> {
  const paper = getPaperGeometry(orientation, bleed)
  // The window must be opened during the click, not after an awaited promise.
  const printWindow = format === 'print' ? window.open('', '_blank') : null
  if (format === 'print' && !printWindow) throw new Error('ポップアップがブロックされました。このサイトのポップアップを許可してください。')
  if (printWindow) {
    printWindow.opener = null
    printWindow.document.title = '印刷データを準備しています…'
    printWindow.document.body.textContent = '印刷データを準備しています…'
  }
  try {
    const svg = await prepareSvg(source, bleed, orientation)
    await document.fonts.ready
    const file = safeFileName(name) + (bleed ? '-bleed' : '')
    if (format === 'svg') {
      download(new Blob([serialize(svg)], { type: 'image/svg+xml;charset=utf-8' }), file + '.svg')
      return
    }
    if (format === 'png') {
      const dpi = 600
      const width = Math.round(paper.width / 25.4 * dpi)
      const height = Math.round(paper.height / 25.4 * dpi)
      svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height))
      const image = await imageFromSvg(svg)
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('このブラウザではPNGを書き出せません。')
      ctx.drawImage(image, 0, 0, width, height)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNGの作成に失敗しました。')), 'image/png'))
      const data = setPngDpi(new Uint8Array(await blob.arrayBuffer()), dpi)
      download(new Blob([data as BlobPart], { type: 'image/png' }), file + '.png')
      return
    }
    if (printWindow) {
      const { width, height } = paper
      const doc = printWindow.document
      doc.documentElement.lang = 'ja'
      doc.title = file
      doc.head.replaceChildren()
      const charset = doc.createElement('meta'); charset.setAttribute('charset', 'UTF-8'); doc.head.append(charset)
      const style = doc.createElement('style')
      style.textContent = `@page{size:${width}mm ${height}mm;margin:0}*{box-sizing:border-box}body{margin:0;background:#f3f4f5;font-family:system-ui,sans-serif;color:#222}nav{padding:20px;text-align:center;font-size:13px}nav p{margin:10px 0;color:#626662}button{padding:9px 16px;margin:0 4px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer}main{width:${width}mm;height:${height}mm;margin:24px auto;background:white;box-shadow:0 5px 24px #0001}svg{display:block;width:${width}mm;height:${height}mm;overflow:hidden}@media print{html,body{width:${width}mm;height:${height}mm;background:white}nav{display:none}main{margin:0;box-shadow:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
      doc.head.append(style)
      doc.body.replaceChildren()
      const nav = doc.createElement('nav')
      const button = doc.createElement('button'); button.textContent = '印刷 / PDF保存'; button.onclick = () => printWindow.print()
      const close = doc.createElement('button'); close.textContent = '閉じる'; close.onclick = () => printWindow.close()
      const note = doc.createElement('p'); note.textContent = `${width} × ${height} mm`
      nav.append(button, close, note)
      const main = doc.createElement('main'); main.append(doc.importNode(svg, true))
      doc.body.append(nav, main)
      await printWindow.document.fonts.ready
      // Decode embedded illustrations before opening the print dialog.
      await Promise.all([...svg.querySelectorAll('image')].map(async element => {
        const image = doc.createElement('img'); image.src = element.getAttribute('href') || ''; await image.decode()
      }))
      printWindow.focus()
      await new Promise(resolve => setTimeout(resolve, 180))
      printWindow.print()
    }
  } catch (error) {
    if (printWindow && !printWindow.closed) printWindow.close()
    throw error
  }
}

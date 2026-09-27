/** Set PNG physical density without changing image pixels. Canvas otherwise uses 96 dpi. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}
export function setPngDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (bytes.length < 33 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71)
    throw new Error('PNGデータが正しくありません。')
  if (!Number.isFinite(dpi) || dpi <= 0) throw new Error('DPIが正しくありません。')
  const chunk = new Uint8Array(21)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, 9)
  chunk.set([112, 72, 89, 115], 4) // pHYs
  view.setUint32(8, Math.round(dpi / .0254))
  view.setUint32(12, Math.round(dpi / .0254))
  chunk[16] = 1
  view.setUint32(17, crc32(chunk.subarray(4, 17)))
  const chunks: Uint8Array[] = [bytes.subarray(0, 33), chunk]
  let offset = 33
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0)
    const end = offset + 12 + length
    if (end > bytes.length) throw new Error('PNGチャンクが破損しています。')
    const isPhys = bytes[offset + 4] === 112 && bytes[offset + 5] === 72 && bytes[offset + 6] === 89 && bytes[offset + 7] === 115
    if (!isPhys) chunks.push(bytes.subarray(offset, end))
    offset = end
  }
  if (offset !== bytes.length) throw new Error('PNGチャンクが破損しています。')
  const output = new Uint8Array(chunks.reduce((sum, part) => sum + part.length, 0))
  offset = 0
  for (const part of chunks) { output.set(part, offset); offset += part.length }
  return output
}

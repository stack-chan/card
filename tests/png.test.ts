import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { crc32, setPngDpi } from '../src/lib/png.ts'
const png = new Uint8Array(readFileSync(new URL('../src/assets/robots/robot-main.png', import.meta.url)))
function chunks(bytes: Uint8Array) {
  const list: { type: string; data: Uint8Array; crc: number }[] = []
  for (let offset = 8; offset < bytes.length;) {
    const v = new DataView(bytes.buffer, bytes.byteOffset + offset)
    const n = v.getUint32(0)
    list.push({ type: new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8)), data: bytes.subarray(offset + 8, offset + 8 + n), crc: v.getUint32(8 + n) })
    offset += n + 12
  }
  return list
}
test('CRC32 matches the standard check value', () => assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926))
test('600 dpi writes a valid pHYs chunk in meters', () => {
  const out = chunks(setPngDpi(png, 600))
  assert.equal(out[1].type, 'pHYs')
  const data = out[1].data
  const v = new DataView(data.buffer, data.byteOffset)
  assert.equal(v.getUint32(0), 23622); assert.equal(v.getUint32(4), 23622); assert.equal(data[8], 1)
  const checksumData = new Uint8Array(13); checksumData.set(new TextEncoder().encode('pHYs')); checksumData.set(data, 4)
  assert.equal(out[1].crc, crc32(checksumData))
})
test('changing DPI replaces previous metadata, without changing pixels', () => {
  const before = chunks(png)
  const out = chunks(setPngDpi(setPngDpi(png, 300), 600))
  assert.equal(out.filter(x => x.type === 'pHYs').length, 1)
  assert.deepEqual(out.filter(x => x.type === 'IDAT'), before.filter(x => x.type === 'IDAT'))
})
test('invalid PNG and DPI values are rejected', () => {
  assert.throws(() => setPngDpi(new Uint8Array(16), 600))
  assert.throws(() => setPngDpi(png, -1))
  assert.throws(() => setPngDpi(png, NaN))
  assert.throws(() => setPngDpi(png.subarray(0, png.length - 1), 600))
})

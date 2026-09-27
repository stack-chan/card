import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DRAFT, LAYOUTS } from '../src/lib/model.ts'
import { approximateMeasure, computeLayout, fitText, graphemes, wrapText, type TextSpec } from '../src/lib/layout.ts'

const spec: TextSpec = { id: 'name', text: 'ししかわ', x: 0, y: 0, width: 437, height: 97, fontSize: 76, minFont: 32, weight: 700, tracking: 2, maxLines: 2, align: 'left' }
test('graphemes keep ZWJ emoji and combining marks intact', () => assert.deepEqual(graphemes('A👨‍👩‍👧‍👦か\u3099'), ['A', '👨‍👩‍👧‍👦', 'か\u3099']))
test('explicit lines are preserved', () => assert.deepEqual(wrapText('hello\nworld', 100, t => t.length), ['hello', 'world']))
test('wrapping uses English word boundaries', () => assert.deepEqual(wrapText('Communication Robots', 15, t => t.length), ['Communication', 'Robots']))
test('wrapping long Japanese/emoji never drops characters', () => {
  const text = 'ロボット👨‍👩‍👧‍👦日本語名刺'
  const lines = wrapText(text, 4, t => graphemes(t).length)
  assert.equal(lines.join(''), text)
  assert.ok(lines.every(line => graphemes(line).length <= 4))
})
test('short name uses requested font size', () => {
  const result = fitText(spec, approximateMeasure)
  assert.equal(result.font, 76); assert.equal(result.overflow, false)
})
test('long name gets smaller and stays inside its box', () => {
  const text = '名刺工房ししかわコミュニティ'
  const result = fitText({ ...spec, text }, approximateMeasure)
  assert.ok(result.font < spec.fontSize); assert.equal(result.overflow, false)
  assert.ok(result.lines.length <= 2)
  assert.equal(result.lines.join(''), text)
  assert.ok(result.sizes.every(size => size <= spec.width))
})
test('too much text is flagged instead of silently truncated', () => {
  const text = '名前'.repeat(30)
  const result = fitText({ ...spec, text }, approximateMeasure)
  assert.equal(result.overflow, true)
  assert.equal(result.lines.join(''), text)
  assert.ok(result.font >= spec.minFont)
})
test('empty fields yield no text lines', () => assert.deepEqual(fitText({ ...spec, text: ' ' }, approximateMeasure).lines, []))
for (const item of LAYOUTS) {
  test(`default content fits layout ${item.id}`, () => {
    const layout = computeLayout(DEFAULT_DRAFT.fields, item.id, approximateMeasure)
    assert.equal(layout.texts.length, 6)
    assert.ok(layout.texts.every(text => !text.overflow))
    assert.ok(layout.texts.every(text => text.x >= 30 && text.x + text.width <= 880))
    assert.ok(layout.texts.every(text => text.sizes.every(size => size <= text.width + .01)))
    assert.equal(layout.contacts.length, 2)
    assert.equal(layout.texts.find(t => t.id === 'x')?.text, '@meganetaaan')
  })
}
test('empty socials remove their icons and text', () => {
  const layout = computeLayout({ ...DEFAULT_DRAFT.fields, github: '', x: '' }, 'left', approximateMeasure)
  assert.deepEqual(layout.contacts, [])
  assert.ok(layout.texts.every(t => t.id !== 'github' && t.id !== 'x'))
})
test('only one social is placed on the first contact row', () => {
  const layout = computeLayout({ ...DEFAULT_DRAFT.fields, github: '', x: 'https://x.com/robotics' }, 'left', approximateMeasure)
  assert.equal(layout.contacts.length, 1)
  assert.ok((layout.texts.find(t => t.id === 'x')?.y ?? 0) > 300)
  assert.equal(layout.texts.find(t => t.id === 'x')?.text, '@robotics')
})
test('primary illustration moves to the opposite side of the text', () => {
  const left = computeLayout(DEFAULT_DRAFT.fields, 'left', approximateMeasure)
  const right = computeLayout(DEFAULT_DRAFT.fields, 'right', approximateMeasure)
  assert.ok(left.main.x > 550)
  assert.ok(right.main.x + right.main.width < right.texts.find(t => t.id === 'name')!.x)
})
test('portrait keeps every optional contact combination inside the safe area', () => {
  const contactKeys = ['email', 'website1', 'website2', 'github', 'x'] as const
  const full = { ...DEFAULT_DRAFT.fields, email: 'hello@example.com', website1: 'https://example.com/', website2: 'https://stack-chan.com/' }
  for (let mask = 0; mask < 32; mask++) {
    const fields = { ...full }
    contactKeys.forEach((key, bit) => { if (!(mask & (1 << bit))) fields[key] = '' })
    const result = computeLayout(fields, 'right', approximateMeasure, 'portrait')
    assert.equal(result.contacts.length, contactKeys.filter(key => fields[key]).length)
    for (const text of result.texts) {
      assert.equal(text.overflow, false, `${mask}: ${text.id}`)
      assert.ok(text.y >= 330 && text.y + text.height <= 880, `${mask}: ${text.id}`)
    }
    for (const icon of result.contacts) assert.ok(icon.x >= 30 && icon.x + icon.size <= 520)
  }
})

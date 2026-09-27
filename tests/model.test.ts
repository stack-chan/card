import test from 'node:test'
import assert from 'node:assert/strict'
import { BACKGROUNDS, LAYOUTS, DEFAULT_DRAFT, FIELD_LIMITS, cleanField, normalizeAccount, normalizeWebsite, getPaperGeometry, restoreDraft, loadDraft, mixWithWhite } from '../src/lib/model.ts'

test('six distinct backgrounds and three layouts', () => {
  assert.equal(new Set(BACKGROUNDS.map(x => x.id)).size, 6)
  assert.equal(new Set(LAYOUTS.map(x => x.id)).size, 3)
})
test('default draft survives serialization', () => assert.deepEqual(restoreDraft(JSON.parse(JSON.stringify(DEFAULT_DRAFT))), DEFAULT_DRAFT))
test('invalid and incompatible drafts return independent defaults', () => {
  for (const v of [null, undefined, 42, 'text', [], {}, { version: 2 }]) assert.deepEqual(restoreDraft(v), DEFAULT_DRAFT)
  const restored = restoreDraft(null); restored.fields.name = 'changed'
  assert.equal(DEFAULT_DRAFT.fields.name, 'ししかわ')
})
test('only known fields and safe design values are restored', () => {
  const d = restoreDraft({ version: 1, fields: { name: 'なまえ', x: 7 }, design: { background: 'invalid', layout: 'outside', accent: 'url(javascript:alert(1))', patternOpacity: NaN } })
  assert.equal(d.fields.name, 'なまえ'); assert.equal(d.fields.x, 'meganetaaan')
  assert.deepEqual(d.design, DEFAULT_DRAFT.design)
})
test('design variants restore, opacity clamps', () => {
  const d = restoreDraft({ version: 1, design: { background: 'blueprint', layout: 'center', orientation: 'landscape', accent: '#aaBBcc', patternOpacity: 10000 } })
  assert.deepEqual(d.design, { background: 'blueprint', layout: 'center', orientation: 'landscape', accent: '#aaBBcc', patternOpacity: 100 })
  assert.equal(restoreDraft({ version: 1, design: { patternOpacity: -100 } }).design.patternOpacity, 15)
})
test('text cleaning removes controls, retains literal markup for React escaping', () => {
  assert.equal(cleanField('A\0B\u0001\nC<script>"&', 'name'), 'AB C<script>"&')
  assert.equal(cleanField('1\n2', 'role'), '1\n2')
  assert.equal(cleanField('1\n2', 'tagline'), '1\n2')
})
test('input limit does not split Unicode surrogate pairs', () => {
  assert.equal([...cleanField('🤖'.repeat(100), 'name')].length, FIELD_LIMITS.name)
  assert.equal(cleanField('a'.repeat(100), 'name').length, FIELD_LIMITS.name)
})
for (const input of [' meganetaaan ', '@meganetaaan', '@@meganetaaan', 'https://github.com/meganetaaan', 'github.com/meganetaaan?tab=repositories', 'https://www.github.com/meganetaaan/repository']) {
  test(`GitHub normalization: ${input}`, () => assert.equal(normalizeAccount(input, 'github'), 'meganetaaan'))
}
for (const input of ['meganetaaan', ' @meganetaaan ', 'https://x.com/meganetaaan/status/1', 'https://twitter.com/meganetaaan?x=1']) {
  test(`X normalization: ${input}`, () => assert.equal(normalizeAccount(input, 'x'), 'meganetaaan'))
}
test('empty account normalization stays empty', () => assert.equal(normalizeAccount(' @ ', 'x'), ''))
test('existing v1 drafts restore new fields and default to landscape', () => {
  const old = { version: 1, fields: { name: '保存済み' }, design: { layout: 'right' } }
  const draft = restoreDraft(old)
  assert.equal(draft.fields.name, '保存済み')
  assert.equal(draft.design.layout, 'right')
  assert.equal(draft.design.orientation, 'landscape')
  assert.equal(draft.fields.website1, '')
  assert.equal(restoreDraft({ ...old, design: { orientation: 'portrait' } }).design.orientation, 'portrait')
  assert.equal(normalizeWebsite('https://example.com/'), 'example.com')
})
test('paper geometry covers both orientations and bleed', () => {
  for (const [orientation, bleed, width, height, viewBox] of [
    ['landscape', false, 91, 55, '0 0 910 550'],
    ['landscape', true, 97, 61, '-30 -30 970 610'],
    ['portrait', false, 55, 91, '0 0 550 910'],
    ['portrait', true, 61, 97, '-30 -30 610 970'],
  ] as const) {
    const paper = getPaperGeometry(orientation, bleed)
    assert.deepEqual([paper.width, paper.height, paper.viewBox], [width, height, viewBox])
  }
})
test('unavailable browser storage degrades to defaults', () => assert.deepEqual(loadDraft(), DEFAULT_DRAFT))
test('color mixing endpoints and clamp', () => {
  assert.equal(mixWithWhite('#000000', 0), '#ffffff')
  assert.equal(mixWithWhite('#ff7700', 1), '#ff7700')
  assert.equal(mixWithWhite('#000000', 2), '#000000')
  assert.equal(mixWithWhite('#000000', -1), '#ffffff')
})

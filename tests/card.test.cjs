const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBundle, resolveTree, serialize, findAll } = require('./helpers.cjs');
const bundle = loadBundle();
const model = bundle.require('src/lib/model.ts');
const layout = bundle.require('src/lib/layout.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const contactKeys = ['email', 'website1', 'website2', 'github', 'x'];
const fullFields = { ...model.DEFAULT_DRAFT.fields, email: 'hello@example.com',
    website1: 'https://example.com/', website2: 'https://stack-chan.com/', github: 'meganetaaan', x: '@meganetaaan' };

test('paper sizes and 600 dpi output cover both orientations and bleed', () => {
    for (const [orientation, bleed, width, height, pixelWidth, pixelHeight, viewBox] of [
        ['landscape', false, 91, 55, 2150, 1299, '0 0 910 550'],
        ['landscape', true, 97, 61, 2291, 1441, '-30 -30 970 610'],
        ['portrait', false, 55, 91, 1299, 2150, '0 0 550 910'],
        ['portrait', true, 61, 97, 1441, 2291, '-30 -30 610 970'],
    ]) {
        const paper = model.getPaperGeometry(orientation, bleed);
        assert.deepEqual([paper.width, paper.height, paper.viewBox], [width, height, viewBox]);
        assert.deepEqual([Math.round(width / 25.4 * 600), Math.round(height / 25.4 * 600)], [pixelWidth, pixelHeight]);
    }
});

test('v1 drafts preserve fields and landscape placement, and restore orientation safely', () => {
    const draft = structuredClone(model.DEFAULT_DRAFT);
    draft.fields.name = '山田 太郎';
    draft.design.layout = 'right';
    delete draft.design.orientation;
    assert.equal(model.restoreDraft(draft).design.orientation, 'landscape');
    for (const orientation of ['portrait', 'landscape', 'invalid', null, 1]) {
        draft.design.orientation = orientation;
        const restored = model.restoreDraft(JSON.parse(JSON.stringify(draft)));
        assert.equal(restored.design.orientation, orientation === 'portrait' ? 'portrait' : 'landscape');
        assert.equal(restored.design.layout, 'right');
        assert.equal(restored.fields.name, '山田 太郎');
    }
    assert.equal(model.restoreDraft(null).design.orientation, 'landscape');
});

test('portrait fits every optional field combination and 0–5 contacts inside safe bounds', () => {
    for (let mask = 0; mask < 256; mask++) {
        const fields = { ...fullFields };
        ['latinName', 'role', 'tagline', ...contactKeys].forEach((key, bit) => { if (!(mask & (1 << bit))) fields[key] = ''; });
        const result = layout.computeLayout(fields, 'right', layout.approximateMeasure, 'portrait');
        assert.equal(result.contacts.length, contactKeys.filter(key => fields[key]).length);
        let previousBottom = 330;
        for (const text of result.texts) {
            assert.equal(text.overflow, false, `${mask}: ${text.id}`);
            assert.ok(text.y >= previousBottom, `${text.id} overlaps preceding text`);
            assert.ok(text.y + text.height <= 880, `${text.id} below safe area`);
            const actualWidth = Math.max(...text.sizes);
            const left = text.align === 'center' ? text.x + (text.width - actualWidth) / 2 : text.x;
            assert.ok(left >= 30 && left + actualWidth <= 520, `${text.id} outside horizontal safe area`);
            previousBottom = text.y + text.height;
        }
        for (const icon of result.contacts) assert.ok(icon.x >= 30 && icon.x + icon.size <= 520);
        if (result.contacts.length) {
            const rows = result.texts.filter(text => contactKeys.includes(text.id));
            assert.ok(result.contacts.every(icon => icon.x === result.contacts[0].x));
            assert.ok(rows.every(text => text.x === rows[0].x));
            const right = rows[0].x + Math.max(...rows.flatMap(text => text.sizes));
            assert.ok(Math.abs((result.contacts[0].x + right) / 2 - 275) < .01);
        }
        const top = 42 + result.illustrationOffsetY;
        const bottom = previousBottom;
        assert.ok(Math.abs(top - (910 - bottom)) < .01, 'composition is vertically centered');
    }
});

test('portrait is independent of stored horizontal layout and reports excessive text', () => {
    const compute = (fields, placement) => plain(layout.computeLayout(fields, placement, layout.approximateMeasure, 'portrait'));
    assert.deepEqual(compute(fullFields, 'left'), compute(fullFields, 'right'));
    assert.deepEqual(compute(fullFields, 'left'), compute(fullFields, 'center'));
    for (const [key, text] of [['name', '長'.repeat(60)], ['website1', 'https://example.com/' + 'x'.repeat(1000)], ['role', '肩書き\n'.repeat(20)]]) {
        const result = compute({ ...fullFields, [key]: text }, 'left');
        assert.ok(result.texts.find(field => field.id === key).overflow, key);
    }
    const short = compute({ ...fullFields, role: 'ものづくり\nロボット開発' }, 'left');
    assert.equal(short.texts.find(field => field.id === 'role').overflow, false);
});

test('orientation control preserves fields and stored placement through a round trip', () => {
    const appBundle = loadBundle(undefined, { window: { confirm: () => true } });
    const App = appBundle.require('src/App.tsx').default;
    const editor = appBundle.require('src/components/editor/DesignPanel.tsx');
    const Card = appBundle.require('src/components/card/CardSvg.tsx').CardSvg;
    const render = () => { appBundle.resetHooks(); return App(); };
    let tree = render();
    const change = patch => findAll(tree, n => n.type === editor.OrientationPicker)[0].props.onChange(patch);
    change({ layout: 'right' }); tree = render();
    const original = findAll(tree, n => n.type === Card)[0].props;
    change({ orientation: 'portrait' }); tree = render();
    let props = findAll(tree, n => n.type === Card)[0].props;
    assert.equal(props.draft.design.orientation, 'portrait');
    assert.equal(props.draft.design.layout, 'right');
    assert.equal(findAll(editor.DesignPanel({ design: props.draft.design, onChange() {} }), n => n.type === 'legend' && n.props.children.includes('配置')).length, 0);
    change({ orientation: 'landscape' }); tree = render();
    props = findAll(tree, n => n.type === Card)[0].props;
    assert.deepEqual(plain(props.layout), plain(original.layout));
    assert.deepEqual(plain(props.draft.fields), plain(original.draft.fields));
    change({ orientation: 'portrait' }); tree = render();
    findAll(tree, n => typeof n.props.onClick === 'function' && n.props.children.includes('初期値に戻す'))[0].props.onClick();
    tree = render();
    props = findAll(tree, n => n.type === Card)[0].props;
    assert.deepEqual(plain(props.draft), plain(model.DEFAULT_DRAFT));
    assert.equal(props.avatar, '');
    assert.equal(props.bleed, false);
});

test('preview caption, aspect ratio, and native print CSS share the selected paper dimensions', () => {
    for (const orientation of ['landscape', 'portrait']) for (const bleed of [false, true]) {
        const draft = structuredClone(model.DEFAULT_DRAFT); draft.design.orientation = orientation;
        const appBundle = loadBundle(undefined, { localStorage: { getItem: key => key === model.STORAGE_KEY ? JSON.stringify(draft) : null } });
        const App = appBundle.require('src/App.tsx').default;
        let tree = App();
        if (bleed) {
            const label = findAll(tree, n => n.type === 'label' && n.props.children.includes('塗り足し 3 mm'))[0];
            label.props.children[0].props.onChange({ target: { checked: true } });
            appBundle.resetHooks(); tree = App();
        }
        const paper = model.getPaperGeometry(orientation, bleed);
        const printStyle = findAll(tree, n => n.type === 'style' && n.props.media === 'print')[0].props.children.join('');
        assert.ok(printStyle.includes(`@page { size:${paper.width}mm ${paper.height}mm;`));
        assert.ok(printStyle.includes(`width:${paper.width}mm; height:${paper.height}mm;`));
        assert.ok(printStyle.includes('.app-shell[data-orientation] .paper-wrap { max-width:none; }'));
        const wrapper = findAll(tree, n => n.props.className === 'paper-wrap')[0];
        assert.equal(wrapper.props.style['--paper-ratio'], paper.width / paper.height);
        assert.ok(findAll(tree, n => n.type === 'span' && n.props.children.includes(`${paper.width} × ${paper.height} mm`)).length);
    }
});

test('all backgrounds and avatars render upright portrait SVGs with correct metadata and guides', () => {
    const { CardSvg } = bundle.require('src/components/card/CardSvg.tsx');
    const { BackgroundThumbnail } = bundle.require('src/components/editor/DesignPanel.tsx');
    const avatar = bundle.require('src/components/card/robotAssets.ts').ROBOTS.happy;
    for (const background of model.BACKGROUNDS.map(bg => bg.id)) for (const bleed of [false, true]) for (const withAvatar of [false, true]) {
        const draft = { ...model.DEFAULT_DRAFT, design: { ...model.DEFAULT_DRAFT.design, orientation: 'portrait', background } };
        const fitted = layout.computeLayout(draft.fields, draft.design.layout, layout.approximateMeasure, 'portrait');
        const tree = resolveTree(CardSvg({ draft, layout: fitted, bleed, guides: true, avatar: withAvatar ? avatar : '' }));
        assert.equal(tree.props.viewBox, bleed ? '-30 -30 610 970' : '0 0 550 910');
        assert.equal(tree.props.width, bleed ? '61mm' : '55mm');
        assert.equal(tree.props.height, bleed ? '97mm' : '91mm');
        const metadata = JSON.parse(findAll(tree, n => n.type === 'metadata')[0].props.children.join(''));
        assert.deepEqual(metadata.trim_mm, [55, 91]);
        assert.equal(metadata.design.orientation, 'portrait');
        const robot = findAll(tree, n => n.props['data-main-robot'])[0].props;
        assert.ok(robot.y + robot.height < fitted.texts[0].y);
        assert.ok(Math.abs(robot.width / robot.height - 1) < .02);
        const guides = findAll(tree, n => n.props['data-guide'])[0];
        assert.equal(guides.props.children[1].props.width, 490);
        assert.equal(guides.props.children[1].props.height, 850);
        const bubble = findAll(tree, n => n.props['data-avatar-bubble']);
        assert.equal(bubble.length, withAvatar ? 1 : 0);
        if (withAvatar) for (const circle of findAll(bubble, n => n.type === 'circle')) {
            assert.ok(circle.props.cy + circle.props.r < fitted.texts[0].y);
            assert.ok(circle.props.cx - circle.props.r >= 30 && circle.props.cx + circle.props.r <= 520);
        }
        assert.equal(BackgroundThumbnail({ design: draft.design, background }).props.viewBox, '0 0 550 910');
        assert.match(serialize(tree), /<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    }
});

// A minimal DOM adapter for checking export boundaries without a browser.
class Element {
    constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; this.textContent = ''; }
    setAttribute(key, value) { this.attrs[key] = String(value); }
    getAttribute(key) { return this.attrs[key] ?? null; }
    getAttributeNS(_, key) { return this.getAttribute(key); }
    removeAttribute(key) { delete this.attrs[key]; }
    removeAttributeNS(_, key) { this.removeAttribute(key); }
    append(...children) { for (const child of children) child.parent = this; this.children.push(...children); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
    querySelectorAll(selector) {
        return this.children.flatMap(child => [...(selector === child.tag || (selector === '[data-guide]' && 'data-guide' in child.attrs) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    cloneNode() {
        const clone = new Element(this.tag); clone.attrs = { ...this.attrs }; clone.textContent = this.textContent;
        clone.append(...this.children.map(child => child.cloneNode())); return clone;
    }
}

test('export snapshots retain orientation, omit guides, and size PNG and print consistently', async () => {
    for (const orientation of ['landscape', 'portrait']) for (const bleed of [false, true]) {
        const source = new Element('svg');
        const metadata = new Element('metadata'); metadata.textContent = JSON.stringify({ design: { orientation } });
        const guide = new Element('g'); guide.setAttribute('data-guide', 'true');
        source.append(metadata, guide);
        const events = { downloads: [], canvases: [] };
        const doc = { head: new Element('head'), body: new Element('body'), documentElement: {}, fonts: { ready: Promise.resolve() },
            createElement(tag) {
                const element = new Element(tag);
                if (tag === 'a') element.click = () => events.downloads.push(element.download);
                if (tag === 'img') element.decode = async () => {};
                if (tag === 'canvas') {
                    events.canvases.push(element);
                    element.getContext = () => ({ drawImage(_image, x, y, width, height) { events.drawn = [x, y, width, height]; } });
                    element.toBlob = callback => callback(new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1kAAAAASUVORK5CYII=', 'base64')]));
                }
                return element;
            }, importNode: node => node.cloneNode() };
        const printWindow = { document: doc, focus() {}, print() { events.printed = true; } };
        const exportBundle = loadBundle(undefined, { document: doc, window: { open: () => printWindow },
            XMLSerializer: class { serializeToString(svg) { events.serialized = { ...svg.attrs }; return '<svg/>'; } },
            Image: class { async decode() {} }, setTimeout: callback => callback() });
        const exporting = exportBundle.require('src/lib/export.ts');
        const captured = exporting.prepareSvg(source, bleed, orientation);
        metadata.textContent = 'changed after export started';
        const prepared = await captured;
        const paper = model.getPaperGeometry(orientation, bleed);
        assert.equal(prepared.getAttribute('viewBox'), paper.viewBox);
        assert.equal(prepared.getAttribute('width'), `${paper.width}mm`);
        assert.equal(prepared.getAttribute('height'), `${paper.height}mm`);
        assert.equal(prepared.querySelectorAll('[data-guide]').length, 0);
        assert.equal(source.querySelectorAll('[data-guide]').length, 1);
        assert.equal(JSON.parse(prepared.querySelector('metadata').textContent).design.orientation, orientation);
        await exporting.exportCard(prepared, 'png', bleed, 'test', orientation);
        const pixels = [Math.round(paper.width / 25.4 * 600), Math.round(paper.height / 25.4 * 600)];
        assert.deepEqual([events.canvases[0].width, events.canvases[0].height], pixels);
        assert.deepEqual(events.drawn, [0, 0, ...pixels]);
        assert.equal(events.downloads.length, 1);
        await exporting.exportCard(prepared, 'svg', bleed, 'test', orientation);
        assert.equal(events.serialized.viewBox, paper.viewBox);
        assert.equal(events.serialized.width, `${paper.width}mm`);
        await exporting.exportCard(prepared, 'print', bleed, 'test', orientation);
        assert.ok(events.printed);
        assert.ok(doc.head.querySelector('style').textContent.includes(`@page{size:${paper.width}mm ${paper.height}mm;`));
        assert.equal(doc.body.querySelector('svg').getAttribute('viewBox'), paper.viewBox);
    }
});

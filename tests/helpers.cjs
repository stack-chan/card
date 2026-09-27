const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Load the shipped, offline bundle without mounting an application or changing it.
function loadBundle(html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'), globals = {}) {
    let sequence = 0;
    let stateIndex = 0;
    const state = [];
    const React = {
        Fragment: 'fragment',
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        forwardRef: render => render,
        useId: () => `test-${sequence++}`,
        useState(initial) {
            const index = stateIndex++;
            if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
            return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
        },
        useMemo: fn => fn(),
        useCallback: fn => fn,
        useRef: value => ({ current: value }),
        useEffect() {},
    };
    const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))
        .replace("if(id==='react')return vr(96540);", "if(id==='react')return testReact;")
        .replace("req('src/main.tsx');", 'globalThis.cardRequire=req;');
    const context = { Intl, structuredClone, Uint8Array, Blob, URL, console, testReact: React, ...globals };
    vm.runInNewContext(script, context);
    return { require: context.cardRequire, context, resetHooks: () => { stateIndex = 0; } };
}

const attributeNames = { className: 'class', textAnchor: 'text-anchor', fontFamily: 'font-family',
    fontSize: 'font-size', fontWeight: 'font-weight', letterSpacing: 'letter-spacing',
    clipPath: 'clip-path', strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray',
    strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', pointerEvents: 'pointer-events' };
function escapeXml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function resolveTree(node) {
    if (Array.isArray(node)) return node.flatMap(item => [].concat(resolveTree(item)));
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return resolveTree(node.type(node.props));
    return { ...node, props: { ...node.props, children: resolveTree(node.props.children) } };
}
function serialize(node) {
    if (Array.isArray(node)) return node.map(serialize).join('');
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node !== 'object') return escapeXml(node);
    if (typeof node.type === 'function') return serialize(node.type(node.props));
    const { children, ...props } = node.props;
    if (node.type === 'fragment') return serialize(children);
    const attributes = Object.entries(props).filter(([key, value]) => !['key', 'ref'].includes(key) && value != null && typeof value !== 'function')
        .map(([key, value]) => {
            if (key === 'style') value = Object.entries(value).map(([k, v]) => `${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${v}`).join(';');
            return ` ${attributeNames[key] || key}="${escapeXml(value)}"`;
        }).join('');
    return `<${node.type}${attributes}>${serialize(children)}</${node.type}>`;
}
function findAll(node, predicate) {
    if (Array.isArray(node)) return node.flatMap(child => findAll(child, predicate));
    if (!node || typeof node !== 'object') return [];
    return [...(predicate(node) ? [node] : []), ...findAll(node.props.children, predicate)];
}
module.exports = { loadBundle, resolveTree, serialize, findAll };

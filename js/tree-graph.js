/**
 * tree-graph.js — Generic Newick/Nexus graph parsing helpers.
 */

/**
 * Extract the first Newick tree string from plain Newick or Nexus text.
 */
export function extractNewick(text) {
  const src = String(text || '').trim();
  if (!src) return ';';

  function normalizeTreeString(treeText) {
    const t = String(treeText || '').trim();
    const start = t.indexOf('(');
    const semi = t.indexOf(';', start >= 0 ? start : 0);
    if (start >= 0 && semi > start) return t.slice(start, semi + 1).trim();
    if (start >= 0) return `${t.slice(start).trim()};`;
    return t.endsWith(';') ? t : `${t};`;
  }

  if (/^#?\s*nexus/i.test(src) || /begin\s+trees\s*;/i.test(src)) {
    const m = src.match(/tree\s+[^=]*=\s*([\s\S]*?;)/i);
    if (m?.[1]) return normalizeTreeString(m[1]);
  }

  const idx = src.indexOf('(');
  if (idx > 0) {
    const semi = src.indexOf(';', idx);
    if (semi > idx) return src.slice(idx, semi + 1).trim();
  }

  return src.endsWith(';') ? src : `${src};`;
}

/**
 * Parse a Newick tree into a simple node graph with children and annotations.
 */
export function parseNewickTree(newick) {
  const s = String(newick || ';');
  let i = 0;

  function skipWs() {
    while (i < s.length && /\s/.test(s[i])) i += 1;
  }

  function readQuotedLabel() {
    let out = '';
    i += 1;
    while (i < s.length) {
      if (s[i] === "'" && s[i + 1] === "'") { out += "'"; i += 2; continue; }
      if (s[i] === "'") { i += 1; break; }
      out += s[i++];
    }
    return out;
  }

  function readUntilStop(stops) {
    let out = '';
    while (i < s.length && !stops.has(s[i])) out += s[i++];
    return out.trim();
  }

  function readBracket() {
    let depth = 0;
    let out = '';
    if (s[i] !== '[') return '';
    while (i < s.length) {
      const ch = s[i++];
      out += ch;
      if (ch === '[') depth += 1;
      if (ch === ']') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    return out;
  }

  function parseNodeMeta(node) {
    skipWs();

    if (s[i] === "'") {
      node.name = readQuotedLabel();
    } else if (!new Set([':', ',', ')', '(', ';', '[']).has(s[i])) {
      node.name = readUntilStop(new Set([':', ',', ')', '(', ';', '[']));
    }

    while (i < s.length) {
      skipWs();
      const ch = s[i];

      if (ch === ':') {
        i += 1;
        const raw = readUntilStop(new Set([',', ')', ';', '[']));
        const n = Number(raw);
        node.length = Number.isFinite(n) ? n : null;
        continue;
      }

      if (ch === '[') {
        const comment = readBracket();
        const content = comment.slice(1, -1).trim();
        if (content.startsWith('&')) {
          Object.assign(node.annotations, parseAnnotationMap(content.slice(1)));
        }
        continue;
      }

      break;
    }
  }

  function parseSubtree() {
    skipWs();
    const node = { name: '', length: null, annotations: {}, children: [] };

    if (s[i] === '(') {
      i += 1;
      while (i < s.length) {
        node.children.push(parseSubtree());
        skipWs();
        if (s[i] === ',') { i += 1; continue; }
        if (s[i] === ')') { i += 1; break; }
        break;
      }
      parseNodeMeta(node);
      return node;
    }

    parseNodeMeta(node);
    return node;
  }

  return parseSubtree();
}

export function walkTree(node, fn) {
  if (!node) return;
  fn(node);
  for (const c of node.children || []) walkTree(c, fn);
}

export function valuePreview(v) {
  if (Array.isArray(v)) return `[${v.slice(0, 3).map(valuePreview).join(', ')}${v.length > 3 ? ', ...' : ''}]`;
  if (v && typeof v === 'object') return '{...}';
  return String(v);
}

function parseAnnotationMap(src) {
  const map = {};
  let i = 0;

  function skipWs() {
    while (i < src.length && /\s/.test(src[i])) i += 1;
  }

  function readKey() {
    skipWs();
    const start = i;
    while (i < src.length && src[i] !== '=' && src[i] !== ',') i += 1;
    return src.slice(start, i).trim();
  }

  function readQuoted(q) {
    i += 1;
    let out = '';
    while (i < src.length) {
      if (src[i] === q) { i += 1; break; }
      out += src[i++];
    }
    return out;
  }

  function readBraceArray() {
    i += 1;
    const arr = [];
    let token = '';
    let depth = 0;

    while (i < src.length) {
      const ch = src[i++];
      if (ch === '{') { depth += 1; token += ch; continue; }
      if (ch === '}') {
        if (depth > 0) { depth -= 1; token += ch; continue; }
        if (token.trim()) arr.push(coercePrimitive(token.trim()));
        break;
      }
      if (ch === ',' && depth === 0) {
        if (token.trim()) arr.push(coercePrimitive(token.trim()));
        token = '';
        continue;
      }
      token += ch;
    }

    return arr.map(v => typeof v === 'string' && v.startsWith('{') && v.endsWith('}')
      ? parseAnnotationMap(`value=${v}`).value
      : v);
  }

  function readValue() {
    skipWs();
    if (src[i] === '{') return readBraceArray();
    if (src[i] === '"') return readQuoted('"');
    if (src[i] === "'") return readQuoted("'");

    const start = i;
    let depth = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '{' || ch === '(' || ch === '[') depth += 1;
      if (ch === '}' || ch === ')' || ch === ']') depth -= 1;
      if (ch === ',' && depth <= 0) break;
      i += 1;
    }
    return coercePrimitive(src.slice(start, i).trim());
  }

  while (i < src.length) {
    const key = readKey();
    if (!key) break;
    if (src[i] === '=') {
      i += 1;
      map[key] = readValue();
    } else {
      map[key] = true;
    }
    skipWs();
    if (src[i] === ',') i += 1;
  }

  return map;
}

function coercePrimitive(raw) {
  if (Array.isArray(raw)) return raw;
  const t = String(raw ?? '').trim();
  if (!t) return '';
  if (/^(true|false)$/i.test(t)) return /^true$/i.test(t);
  const n = Number(t);
  if (Number.isFinite(n)) return n;
  return t;
}

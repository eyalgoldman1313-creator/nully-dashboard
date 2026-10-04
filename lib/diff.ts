// Snapshot diff: normalized snapshot data (see scripts/shopify-snapshot.mjs) -> human-readable change list.
export type Change = { area: string; kind: 'added' | 'removed' | 'changed' | 'moved'; path: string; before?: any; after?: any };

const TEMPLATE_LABEL: Record<string, string> = {
  'templates/index.json': 'דף הבית',
  'templates/product.json': 'דף מוצר (תבנית)',
  'templates/cart.json': 'עגלה (תבנית)',
  'sections/header-group.json': 'הדר',
  'sections/footer-group.json': 'פוטר',
  'config/settings_data.json': 'הגדרות ערכה',
};
export const AREAS = ['דף הבית', 'דף מוצר (תבנית)', 'עגלה (תבנית)', 'הדר', 'פוטר', 'הגדרות ערכה', 'מוצר', 'וריאנטים ומחירים', 'מדיניות', 'תפריטים', 'חנות וערכה', 'קבצי ערכה'];

export function flatten(v: any, prefix = '', out: Record<string, any> = {}) {
  if (v === null || v === undefined || typeof v !== 'object') { out[prefix] = v; return out; }
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || typeof x !== 'object')) { out[prefix] = v.join(' | '); return out; }
    v.forEach((x, i) => flatten(x, `${prefix}[${i}]`, out));
    return out;
  }
  const keys = Object.keys(v);
  if (!keys.length) { out[prefix] = '{}'; return out; }
  for (const k of keys) flatten(v[k], prefix ? `${prefix}.${k}` : k, out);
  return out;
}
function diffFlat(area: string, base: string, a: any, b: any, out: Change[]) {
  const fa = flatten(a ?? {}), fb = flatten(b ?? {});
  const keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  for (const k of [...keys].sort()) {
    const path = [base, k].filter(Boolean).join(' › ');
    const inA = k in fa, inB = k in fb;
    if (inA && inB) { if (String(fa[k]) !== String(fb[k])) out.push({ area, kind: 'changed', path, before: fa[k], after: fb[k] }); }
    else if (inB) out.push({ area, kind: 'added', path, after: fb[k] });
    else out.push({ area, kind: 'removed', path, before: fa[k] });
  }
}
const same = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);

function diffTemplate(area: string, a: any, b: any, out: Change[]) {
  if (!a || !b) { out.push({ area, kind: a ? 'removed' : 'added', path: 'התבנית כולה' }); return; }
  if (a.current !== undefined || b.current !== undefined) { diffFlat(area, '', a.current, b.current, out); return; }
  const ia = a.sections.map((s: any) => s.id), ib = b.sections.map((s: any) => s.id);
  const common = ia.filter((x: string) => ib.includes(x));
  const commonB = ib.filter((x: string) => ia.includes(x));
  if (!same(common, commonB)) out.push({ area, kind: 'moved', path: 'סדר הסקשנים', before: ia.join(' → '), after: ib.join(' → ') });
  for (const s of b.sections) if (!ia.includes(s.id)) out.push({ area, kind: 'added', path: `סקשן ${s.id}`, after: `${s.type}${s.disabled ? ' (כבוי)' : ''}` });
  for (const s of a.sections) if (!ib.includes(s.id)) out.push({ area, kind: 'removed', path: `סקשן ${s.id}`, before: `${s.type}${s.disabled ? ' (כבוי)' : ''}` });
  for (const sb of b.sections) {
    const sa = a.sections.find((x: any) => x.id === sb.id);
    if (!sa) continue;
    const base = `סקשן ${sb.id}`;
    if (sa.type !== sb.type) out.push({ area, kind: 'changed', path: `${base} › type`, before: sa.type, after: sb.type });
    if (sa.disabled !== sb.disabled) out.push({ area, kind: 'changed', path: `${base} › disabled`, before: String(sa.disabled), after: String(sb.disabled) });
    diffFlat(area, `${base} › settings`, sa.settings, sb.settings, out);
    const ba = sa.blocks.map((x: any) => x.id), bb = sb.blocks.map((x: any) => x.id);
    for (const blk of sb.blocks) if (!ba.includes(blk.id)) out.push({ area, kind: 'added', path: `${base} › בלוק ${blk.id}`, after: blk.type });
    for (const blk of sa.blocks) if (!bb.includes(blk.id)) out.push({ area, kind: 'removed', path: `${base} › בלוק ${blk.id}`, before: blk.type });
    const cm = ba.filter((x: string) => bb.includes(x)), cmB = bb.filter((x: string) => ba.includes(x));
    if (!same(cm, cmB)) out.push({ area, kind: 'moved', path: `${base} › סדר הבלוקים`, before: ba.join(' → '), after: bb.join(' → ') });
    for (const blk of sb.blocks) {
      const o = sa.blocks.find((x: any) => x.id === blk.id);
      if (!o) continue;
      if (o.type !== blk.type) out.push({ area, kind: 'changed', path: `${base} › בלוק ${blk.id} › type`, before: o.type, after: blk.type });
      if (o.disabled !== blk.disabled) out.push({ area, kind: 'changed', path: `${base} › בלוק ${blk.id} › disabled`, before: String(o.disabled), after: String(blk.disabled) });
      diffFlat(area, `${base} › בלוק ${blk.id} › settings`, o.settings, blk.settings, out);
    }
  }
}

export function diffSnapshots(a: any, b: any): Change[] {
  const out: Change[] = [];
  if (!a || !b) return out;
  // templates
  const names = new Set([...Object.keys(a.templates || {}), ...Object.keys(b.templates || {})]);
  for (const n of names) diffTemplate(TEMPLATE_LABEL[n] || n, a.templates?.[n], b.templates?.[n], out);
  // products
  const pa = Object.fromEntries((a.products || []).map((p: any) => [p.handle, p]));
  const pb = Object.fromEntries((b.products || []).map((p: any) => [p.handle, p]));
  for (const h of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
    const x = pa[h], y = pb[h];
    if (!x || !y) { out.push({ area: 'מוצר', kind: x ? 'removed' : 'added', path: `מוצר ${h}`, before: x?.title, after: y?.title }); continue; }
    const { variants: va, ...ra } = x, { variants: vb, ...rb } = y;
    diffFlat('מוצר', h, ra, rb, out);
    const ka = (va || []).map((v: any) => v.title), kb = (vb || []).map((v: any) => v.title);
    for (const v of vb || []) if (!ka.includes(v.title)) out.push({ area: 'וריאנטים ומחירים', kind: 'added', path: `וריאנט ${v.title}`, after: `מחיר ${v.price}` });
    for (const v of va || []) if (!kb.includes(v.title)) out.push({ area: 'וריאנטים ומחירים', kind: 'removed', path: `וריאנט ${v.title}`, before: `מחיר ${v.price}` });
    for (const v of vb || []) { const o = (va || []).find((q: any) => q.title === v.title); if (o) diffFlat('וריאנטים ומחירים', `וריאנט ${v.title}`, o, v, out); }
  }
  // policies
  const la = Object.fromEntries((a.policies || []).map((p: any) => [p.type, p])), lb = Object.fromEntries((b.policies || []).map((p: any) => [p.type, p]));
  for (const t of new Set([...Object.keys(la), ...Object.keys(lb)])) {
    const x = la[t], y = lb[t];
    if (!x || !y) out.push({ area: 'מדיניות', kind: x ? 'removed' : 'added', path: `מדיניות ${t}`, before: x?.title, after: y?.title });
    else diffFlat('מדיניות', t, x, y, out);
  }
  // menus
  const ma = Object.fromEntries((a.menus || []).map((m: any) => [m.handle, m])), mb = Object.fromEntries((b.menus || []).map((m: any) => [m.handle, m]));
  for (const h of new Set([...Object.keys(ma), ...Object.keys(mb)])) {
    if (!ma[h] || !mb[h]) out.push({ area: 'תפריטים', kind: ma[h] ? 'removed' : 'added', path: `תפריט ${h}`, before: ma[h]?.title, after: mb[h]?.title });
    else diffFlat('תפריטים', h, ma[h], mb[h], out);
  }
  // shop / theme / locales
  diffFlat('חנות וערכה', 'ערכה', { name: a.theme?.name, role: a.theme?.role }, { name: b.theme?.name, role: b.theme?.role }, out);
  diffFlat('חנות וערכה', 'חנות', a.shop, b.shop, out);
  diffFlat('חנות וערכה', 'שפות', a.locales, b.locales, out);
  // files (checksum)
  const fa = a.files || {}, fb = b.files || {};
  for (const f of [...new Set([...Object.keys(fa), ...Object.keys(fb)])].sort()) {
    if (!fa[f]) out.push({ area: 'קבצי ערכה', kind: 'added', path: f, after: `${fb[f].size} bytes` });
    else if (!fb[f]) out.push({ area: 'קבצי ערכה', kind: 'removed', path: f, before: `${fa[f].size} bytes` });
    else if (fa[f].checksum !== fb[f].checksum) out.push({ area: 'קבצי ערכה', kind: 'changed', path: f, before: `${fa[f].size} bytes`, after: `${fb[f].size} bytes` });
  }
  return out;
}

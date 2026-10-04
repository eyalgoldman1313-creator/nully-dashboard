// Run: npx tsx scripts/test-logic.ts
import assert from 'node:assert/strict';
import { reconcile } from '../lib/logic';
import { diffSnapshots } from '../lib/diff';

const mk = (id: string, status: string, blockers: string[] = [], extra: any = {}) => ({ id, status, blockers, partial_blockers: [], auto_released: false, ...extra });
// 1) deciding D3 releases tasks that only waited for D3, but not T5.1 (also waits for T4.2)
let tasks = [mk('T1.2', 'blocked', ['D3']), mk('T5.1', 'blocked', ['D3', 'T4.2']), mk('T4.2', 'blocked', ['T4.1']), mk('T4.1', 'open')];
let decisions: any[] = [{ id: 'D3', status: 'decided' }];
let ch = reconcile(tasks, decisions, []);
assert.deepEqual(ch.map((c) => c.id), ['T1.2']);
assert.equal(tasks[0].status, 'open'); assert.equal(tasks[1].status, 'blocked');
// 2) finishing T4.1 cascades: T4.2 opens, then T5.1 stays blocked until T4.2 is done
tasks[3].status = 'done'; ch = reconcile(tasks, decisions, []);
assert.deepEqual(ch.map((c) => c.id), ['T4.2']); tasks[2].status = 'done'; ch = reconcile(tasks, decisions, []);
assert.deepEqual(ch.map((c) => c.id), ['T5.1']);
// 3) re-opening the decision re-blocks only auto-released tasks
decisions[0].status = 'open'; ch = reconcile(tasks, decisions, []);
assert.ok(ch.some((c) => c.id === 'T1.2' && c.to === 'blocked'));
// 4) manual in-progress task is not touched
const t2 = [mk('X', 'in_progress', ['D3'])]; assert.equal(reconcile(t2, decisions, []).length, 0);

// diff
const snap = (over: any = {}) => ({ templates: { 'templates/index.json': { order: ['a', 'b'], sections: [{ id: 'a', type: 's', disabled: false, settings: { h: 'x' }, blocks: [] }, { id: 'b', type: 's', disabled: false, settings: {}, blocks: [] }] } },
  products: [{ handle: 'p', title: 'T', variants: [{ title: 'v1', price: '220.00' }] }], policies: [], menus: [], files: {}, theme: { name: 'n', role: 'UNPUBLISHED' }, shop: {}, locales: [], ...over });
const a = snap();
const b = snap({ templates: { 'templates/index.json': { order: ['b', 'a', 'c'], sections: [{ id: 'b', type: 's', disabled: false, settings: {}, blocks: [] }, { id: 'a', type: 's', disabled: true, settings: { h: 'y' }, blocks: [] }, { id: 'c', type: 's', disabled: false, settings: {}, blocks: [] }] } }, products: [{ handle: 'p', title: 'T', variants: [{ title: 'v1', price: '250.00' }] }] });
const d = diffSnapshots(a, b);
const has = (k: string, p: RegExp) => d.some((c) => c.kind === k && p.test(c.path));
assert.ok(has('moved', /סדר הסקשנים/)); assert.ok(has('added', /סקשן c/)); assert.ok(has('changed', /a › settings › h/)); assert.ok(has('changed', /disabled/));
assert.ok(d.some((c) => c.area === 'וריאנטים ומחירים' && c.path.includes('price') && c.before === '220.00' && c.after === '250.00'));
assert.equal(diffSnapshots(a, snap()).length, 0);
console.log('logic + diff tests passed');

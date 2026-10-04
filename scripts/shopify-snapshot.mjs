#!/usr/bin/env node
/**
 * Nully dashboard — READ-ONLY Shopify snapshot.
 *
 * Captures the key content of the draft theme (home/product template section order + settings),
 * the product (title/price/variants), policies and menus into a normalized JSON snapshot.
 *
 * STRICTLY READ ONLY: only GraphQL *queries* are sent (the script refuses any document that
 * contains the word "mutation"). The client secret and the access token are never printed.
 *
 * Env:
 *   SHOPIFY_CLIENT_SECRET   (required)  client secret of the app (client_credentials grant)
 *   SHOPIFY_CLIENT_ID       (optional)  defaults to the Nully app id
 *   SHOPIFY_SHOP            (optional)  defaults to cfam0j-2j.myshopify.com
 *   SHOPIFY_THEME_ID        (optional)  defaults to 154899021876 (draft "Nully Horizon RTL")
 *   DASHBOARD_URL, BOT_TOKEN (optional) with --push: POST the snapshot to /api/bot-update
 *
 * Usage:
 *   node scripts/shopify-snapshot.mjs                 # writes data/snapshots/<timestamp>.json (+ latest.json)
 *   node scripts/shopify-snapshot.mjs --push          # also pushes to the dashboard
 *   node scripts/shopify-snapshot.mjs --label "after T1.1"
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOP = process.env.SHOPIFY_SHOP || 'cfam0j-2j.myshopify.com';
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'ba033d6fa9de3a0d5d5d3952960d007b';
const THEME_ID = process.env.SHOPIFY_THEME_ID || '154899021876';
const API = '2025-07';
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

if (!process.env.SHOPIFY_CLIENT_SECRET) {
  console.error('SHOPIFY_CLIENT_SECRET is not set');
  process.exit(2);
}

async function mintToken() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET }),
  });
  if (!r.ok) throw new Error(`token request failed: HTTP ${r.status}`);
  const j = await r.json();
  if (!j.access_token) throw new Error('token response without access_token');
  return j.access_token;
}

let TOKEN;
async function gql(query, variables = {}) {
  if (/\bmutation\b/i.test(query)) throw new Error('READ-ONLY script: mutations are forbidden');
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`graphql HTTP ${r.status}`);
  const j = await r.json();
  if (j.errors) throw new Error('graphql errors: ' + JSON.stringify(j.errors).slice(0, 500));
  return j.data;
}

const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;
const md5 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

/** Shopify theme JSON templates may start with a /* comment block */
function parseThemeJson(text) {
  const clean = text.replace(/^\s*\/\*[\s\S]*?\*\//, '');
  return JSON.parse(clean);
}

function normalizeTemplate(json) {
  const sections = json.sections || {};
  const order = json.order || Object.keys(sections);
  return {
    order,
    sections: order.map((id) => {
      const s = sections[id] || {};
      const blockOrder = s.block_order || Object.keys(s.blocks || {});
      return {
        id,
        type: s.type ?? null,
        disabled: !!s.disabled,
        settings: sortKeys(s.settings || {}),
        blocks: blockOrder.map((bid) => {
          const b = (s.blocks || {})[bid] || {};
          return { id: bid, type: b.type ?? null, disabled: !!b.disabled, settings: sortKeys(b.settings || {}) };
        }),
      };
    }),
  };
}

async function readFiles(themeGid, names) {
  const out = {};
  const q = `query($id: ID!, $names: [String!]) { theme(id: $id) { files(filenames: $names, first: 50) { nodes { filename size checksumMd5 updatedAt body { ... on OnlineStoreThemeFileBodyText { content } } } } } }`;
  const d = await gql(q, { id: themeGid, names });
  for (const n of d.theme.files.nodes) out[n.filename] = n;
  return out;
}

async function main() {
  TOKEN = await mintToken();
  const themeGid = `gid://shopify/OnlineStoreTheme/${THEME_ID}`;

  const meta = await gql(`query($id: ID!) { theme(id: $id) { id name role updatedAt processing } shop { name currencyCode primaryDomain { url } myshopifyDomain } shopLocales { locale primary published } }`, { id: themeGid });
  if (!meta.theme) throw new Error('draft theme not found');

  // file manifest (names + checksums) -> lets us show *which files* changed
  const manifest = {};
  let after = null;
  for (;;) {
    const d = await gql(`query($id: ID!, $after: String) { theme(id: $id) { files(first: 250, after: $after) { nodes { filename size checksumMd5 updatedAt } pageInfo { hasNextPage endCursor } } } }`, { id: themeGid, after });
    for (const n of d.theme.files.nodes) manifest[n.filename] = { size: n.size, checksum: n.checksumMd5, updatedAt: n.updatedAt };
    if (!d.theme.files.pageInfo.hasNextPage) break;
    after = d.theme.files.pageInfo.endCursor;
  }

  const wanted = ['templates/index.json', 'templates/product.json', 'templates/cart.json', 'sections/header-group.json', 'sections/footer-group.json', 'config/settings_data.json'];
  const files = await readFiles(themeGid, wanted);
  const templates = {};
  for (const name of wanted) {
    const f = files[name];
    if (!f || !f.body?.content) continue;
    const json = parseThemeJson(f.body.content);
    if (name === 'config/settings_data.json') {
      templates[name] = { current: sortKeys(json.current && typeof json.current === 'object' ? json.current : { preset: json.current }) };
    } else if (name.startsWith('sections/')) {
      templates[name] = normalizeTemplate(json);
    } else {
      templates[name] = normalizeTemplate(json);
    }
  }

  const prod = await gql(`query { products(first: 10, query: "handle:nully-brainy") { nodes {
      id title handle status vendor productType tags descriptionHtml onlineStoreUrl
      seo { title description }
      options { name values }
      media(first: 30) { nodes { alt mediaContentType } }
      sellingPlanGroups(first: 10) { nodes { name options sellingPlans(first: 10) { nodes { name } } } }
      onetime: metafield(namespace: "nully", key: "onetime_price") { value }
      variants(first: 50) { nodes { id title sku price compareAtPrice inventoryPolicy taxable
        selectedOptions { name value }
        inventoryItem { tracked }
        onetime: metafield(namespace: "nully", key: "onetime_price") { value } } }
  } } }`);
  const products = prod.products.nodes.map((p) => sortKeys({
    handle: p.handle, title: p.title, status: p.status, vendor: p.vendor, productType: p.productType,
    tags: [...p.tags].sort(), seo: p.seo, options: p.options,
    description: p.descriptionHtml, onetimePriceMetafield: p.onetime?.value ?? null,
    mediaAlts: p.media.nodes.map((m) => m.alt || ''),
    sellingPlanGroups: p.sellingPlanGroups.nodes.map((g) => ({ name: g.name, plans: g.sellingPlans.nodes.map((s) => s.name) })),
    variants: p.variants.nodes.map((v) => ({
      title: v.title, sku: v.sku, price: v.price, compareAtPrice: v.compareAtPrice,
      inventoryPolicy: v.inventoryPolicy, tracked: v.inventoryItem?.tracked ?? null,
      onetimePrice: v.onetime?.value ?? null,
      options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
    })),
  }));

  const pol = await gql(`query { shop { shopPolicies { type title url body } } }`);
  const policies = pol.shop.shopPolicies.map((p) => ({ type: p.type, title: p.title, url: p.url, body: p.body }))
    .sort((a, b) => a.type.localeCompare(b.type));

  const menusData = await gql(`query { menus(first: 20) { nodes { handle title items { title url type items { title url type items { title url type } } } } } }`);
  const menus = menusData.menus.nodes.map((m) => sortKeys(m)).sort((a, b) => a.handle.localeCompare(b.handle));

  const data = {
    schema: 1,
    shop: { myshopify: meta.shop.myshopifyDomain, name: meta.shop.name, currency: meta.shop.currencyCode, primaryDomain: meta.shop.primaryDomain.url },
    locales: meta.shopLocales,
    theme: { id: THEME_ID, name: meta.theme.name, role: meta.theme.role, updatedAt: meta.theme.updatedAt },
    templates,
    products,
    policies,
    menus,
    files: manifest,
  };
  const capturedAt = new Date().toISOString();
  const snapshot = {
    id: capturedAt.replace(/[:.]/g, '-'),
    captured_at: capturedAt,
    label: opt('--label') || null,
    source: 'shopify-snapshot.mjs (read-only)',
    content_hash: md5(JSON.stringify(data)),
    data,
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const dir = join(here, '..', 'data', 'snapshots');
  mkdirSync(dir, { recursive: true });
  const text = JSON.stringify(snapshot, null, 2) + '\n';
  writeFileSync(join(dir, `${snapshot.id}.json`), text);
  writeFileSync(join(dir, 'latest.json'), text);
  console.log(`snapshot ${snapshot.id} hash=${snapshot.content_hash} files=${Object.keys(manifest).length} sections(home)=${templates['templates/index.json']?.sections.length} sections(product)=${templates['templates/product.json']?.sections.length} variants=${products[0]?.variants.length} policies=${policies.length} menus=${menus.length}`);

  if (flag('--push')) {
    const url = process.env.DASHBOARD_URL, tok = process.env.BOT_TOKEN;
    if (!url || !tok) throw new Error('--push needs DASHBOARD_URL and BOT_TOKEN');
    const r = await fetch(`${url.replace(/\/$/, '')}/api/bot-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ actor: 'bot:shopify-snapshot', action: 'push_snapshot', snapshot }),
    });
    console.log('push ->', r.status, (await r.text()).slice(0, 300));
    if (!r.ok) process.exit(1);
  }
}

main().catch((e) => { console.error('snapshot failed:', e.message); process.exit(1); });

import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(resolve(root, p), 'utf8');
const write = (p, d) => writeFile(resolve(root, p), JSON.stringify(d, null, 2) + '\n');
const table = (await read('docs/localization-copy.tsv')).trimEnd().split('\n').map((s) => s.split('\t'));
const locales = table.shift().slice(1);
const source = JSON.parse(await read('locales/en.default.json'));
source.hp_store.localization = { label: 'Language', submit: 'Change language' };
const pages = JSON.parse(await read('docs/store-pages.json')).pages;
source.hp_pages = Object.fromEntries(pages.filter((p) => p.kind === 'hp-page').map((p) => [p.handle.replaceAll('-', '_'), { kicker: p.kicker, intro: p.intro }]));
const keySet = new Set();
const placeholders = (s) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();
const get = (d, key) => key.split('.').reduce((a, k) => a?.[k], d);
for (const row of table) {
  assert.equal(row.length, locales.length + 1, 'Column count: ' + row[0]);
  assert(!keySet.has(row[0]), 'Duplicate key: ' + row[0]);
  keySet.add(row[0]);
  const original = get(source, row[0]);
  assert.equal(typeof original, 'string', 'Unknown source key: ' + row[0]);
  for (const value of row.slice(1)) {
    assert(value.trim(), 'Empty translation: ' + row[0]);
    assert.deepEqual(placeholders(value), placeholders(original), 'Interpolation: ' + row[0]);
  }
}
const flatten = (d, prefix = '') => Object.entries(d).flatMap(([k, v]) => typeof v === 'object' ? flatten(v, prefix + k + '.') : [prefix + k]);
const required = flatten({ hiparcelo: source.hiparcelo, hp_store: source.hp_store });
assert.deepEqual([...keySet].sort(), required.sort(), 'Complete custom translation coverage');
await write('locales/en.default.json', source);
for (let index = 0; index < locales.length; index++) {
  const locale = locales[index];
  const content = JSON.parse(await read('locales/' + locale + '.json'));
  for (const name of ['hiparcelo', 'hp_store']) content[name] = {};
  for (const [key, ...values] of table) {
    const parts = key.split('.');
    let target = content;
    for (const part of parts.slice(0, -1)) target = target[part] ??= {};
    target[parts.at(-1)] = values[index];
  }
  const localizedPages = JSON.parse(await read('docs/localization/pages-' + locale + '.json'));
  localizedPages.help = { title: content.hp_store.common.help, body: '<p>' + content.hp_store.faq.intro + '</p>' };
  localizedPages['track-order'] = { title: content.hp_store.common.track, body: '<p>' + content.hp_store.tracking.no_lookup + '</p><p>' + content.hp_store.tracking.prelaunch + '</p>' };
  localizedPages['first-find'] = { title: content.hp_store.common.first_find, body: '<p>' + content.hp_store.product.preview_copy + '</p><p>' + content.hp_store.faq.products_a + '</p>' };
  localizedPages.contact = { title: content.hp_store.common.contact };
  for (const page of Object.values(localizedPages)) {
    if (page.body) page.body = page.body.replace(/href=(["'])\/pages\//g, 'href=$1/' + locale.toLowerCase() + '/pages/');
  }
  content.hp_pages = {};
  for (const page of pages.filter((p) => p.kind === 'hp-page')) {
    const translated = localizedPages[page.handle];
    assert(translated?.kicker && translated?.intro && translated?.body && translated?.title, 'Missing page content ' + locale + ':' + page.handle);
    content.hp_pages[page.handle.replaceAll('-', '_')] = { kicker: translated.kicker, intro: translated.intro };
  }
  await write('locales/' + locale + '.json', content);
  await write('docs/localization/pages-' + locale + '.json', localizedPages);
}
const schema = JSON.parse(await read('locales/en.default.schema.json'));
schema.hp_store.localization_key = 'Translation content key';
schema.hp_store.localization_info = 'Prepared page heading key. Clear it to use the custom heading and introduction below.';
await write('locales/en.default.schema.json', schema);
for (const page of pages.filter((p) => p.kind === 'hp-page')) {
  const path = 'templates/page.' + page.template + '.json';
  const template = JSON.parse(await read(path));
  template.sections.main.settings.localization_key = page.handle.replaceAll('-', '_');
  await write(path, template);
}
console.log(JSON.stringify({ locales, custom_keys_per_language: keySet.size, page_headers_per_language: Object.keys(source.hp_pages).length }));

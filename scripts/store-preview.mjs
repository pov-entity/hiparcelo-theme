import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { Liquid } from 'liquidjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const locale = process.env.HP_LOCALE || 'en';
const languagePrefix = locale === 'en' ? '' : '/' + locale.toLowerCase();
const output = resolve(root, 'preview-output/store-' + locale);
const read = (path) => readFile(resolve(root, path), 'utf8');
const extract = (text, tag) => [...text.matchAll(new RegExp('{%-?\\s*' + tag + '\\s*-?%}([\\s\\S]*?){%-?\\s*end' + tag + '\\s*-?%}', 'g'))].map((m) => m[1]).join('\n');
const strip = (text) => text.replace(/{%-?\s*(schema|stylesheet|javascript|doc)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}/g, '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
await mkdir(resolve(output, 'snippets'), { recursive: true });
for (const snippet of ['hp-icon', 'hp-localization']) await writeFile(resolve(output, 'snippets/' + snippet + '.liquid'), strip(await read('snippets/' + snippet + '.liquid')).replace(/{%-?\s*form\s+[^%]*-?%}/g, '<form data-local-form="true">').replace(/{%-?\s*endform\s*-?%}/g, '</form>'));
const engine = new Liquid({ root: resolve(output, 'snippets'), extname: '.liquid', strictFilters: true });
const translations = JSON.parse(await read('locales/' + (locale === 'en' ? 'en.default' : locale) + '.json'));
const text = (key) => key.split('.').reduce((a, k) => a?.[k], translations);
engine.registerFilter('t', (key, ...args) => {
  let value = String(key).split('.').reduce((a, k) => a?.[k], translations);
  assert.equal(typeof value, 'string', 'Missing translation ' + key);
  for (const arg of args) if (Array.isArray(arg)) value = value.replaceAll('{{ ' + arg[0] + ' }}', String(arg[1]));
  return value;
});
engine.registerFilter('asset_url', (s) => '/assets/' + s);
engine.registerFilter('json', JSON.stringify);
engine.registerFilter('default_errors', () => '');
engine.registerFilter('money_with_currency', (value) => '$' + (Number(value) / 100).toFixed(2) + ' USD');
engine.registerFilter('image_url', (image) => image?.src || image);
engine.registerFilter('image_tag', (url, ...pairs) => {
  const attrs = Object.fromEntries(pairs.filter(Array.isArray));
  const keys = ['alt', 'class', 'loading', 'fetchpriority', 'sizes', 'data-hp-main-image'];
  return '<img src="' + esc(url) + '" width="1536" height="1024" ' + keys.filter((k) => attrs[k] !== undefined).map((k) => k + '="' + esc(attrs[k]) + '"').join(' ') + (attrs.alt === undefined ? ' alt=""' : '') + '>';
});
const settings = JSON.parse(await read('config/settings_data.json')).current;
for (const group of JSON.parse(await read('config/settings_schema.json'))) for (const field of group.settings || []) if (settings[field.id] === undefined && field.default !== undefined) settings[field.id] = field.default;
assert.equal(settings.hp_commerce_enabled, false);
assert.equal(settings.hp_contact_enabled, false);
assert.equal(settings.hp_store_preparation, true);
const pageSource = JSON.parse(await read('docs/store-pages.json')).pages;
const localizedPages = locale === 'en' ? {} : JSON.parse(await read('docs/localization/pages-' + locale + '.json'));
const pages = pageSource.map((page) => ({ ...page, ...localizedPages[page.handle], body: (localizedPages[page.handle]?.body || page.body).replaceAll('\\"', '"') }));
const pagesByHandle = new Map(pages.map((page) => [page.handle, page]));
const routes = { root_url: languagePrefix || '/', cart_url: languagePrefix + '/cart', cart_change_url: languagePrefix + '/cart/change', account_login_url: languagePrefix + '/account/login' };
const languageNames = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español', it: 'Italiano', nl: 'Nederlands', 'pt-PT': 'Português (Portugal)' };
const availableLanguages = Object.entries(languageNames).map(([iso_code, endonym_name]) => ({ iso_code, endonym_name }));
const context = { settings, routes, localization: { available_languages: availableLanguages, language: availableLanguages.find((l) => l.iso_code === locale) }, shop: { name: 'HiParcelo', email: 'preview@example.test', policies: [], customer_accounts_enabled: false }, cart: { item_count: 0, items: [] }, request: { locale: { iso_code: locale } }, template: { name: 'page' }, form: { errors: null, 'posted_successfully?': false } };
const sources = new Map();
async function renderSection(type, data = {}, extra = {}) {
  const source = sources.get(type) || await read('sections/' + type + '.liquid');
  sources.set(type, source);
  const schema = JSON.parse(extract(source, 'schema'));
  const defaults = Object.fromEntries((schema.settings || []).filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));
  const section = { id: type, settings: { ...defaults, ...data.settings }, blocks: (data.block_order || []).map((id) => ({ id, ...data.blocks[id], shopify_attributes: '' })) };
  const content = strip(source).replace(/{%-?\s*form\s+[^%]*-?%}/g, '<form data-local-form="true">').replace(/{%-?\s*endform\s*-?%}/g, '</form>');
  engine.options.globals = { ...context, ...extra };
  return engine.parseAndRender(content, { ...context, ...extra, section });
}
async function renderTemplate(file, extra = {}) {
  const template = JSON.parse(await read(file));
  let result = '';
  for (const id of template.order) result += await renderSection(template.sections[id].type, template.sections[id], extra);
  return result;
}
const header = await renderSection('hp-header');
const footer = await renderSection('hp-footer');
assert(header.includes('name="locale_code"'), 'Native language control available');
assert(header.includes('value="' + locale + '" lang="' + locale + '" selected'), 'Current language selected');
const singleLanguageHeader = await renderSection('hp-header', {}, { localization: { available_languages: [context.localization.language], language: context.localization.language } });
assert(!singleLanguageHeader.includes('name="locale_code"'), 'No unavailable languages offered');
const notice = await engine.parseAndRender(strip(await read('snippets/hp-store-status.liquid')), context);
const rendered = new Map();
for (const page of pages) {
  const html = await renderTemplate('templates/page.' + page.template + '.json', { page: { title: page.title, content: page.body, handle: page.handle } });
  assert.equal((html.match(/<h1\b/g) || []).length, 1, page.handle + ': one main heading');
  assert(!html.includes('translation missing'), page.handle);
  if (page.draft) assert(html.includes(text('hp_store.common.draft')), page.handle + ': draft label');
  rendered.set('/pages/' + page.handle, html);
}
const contact = await renderTemplate('templates/page.contact.json');
assert(contact.includes('fieldset disabled'), 'Contact preview cannot submit');
assert(contact.includes(text('hp_store.form.disabled')));
rendered.set('/pages/contact', contact);
const contactActive = await renderTemplate('templates/page.contact.json', { settings: { ...settings, hp_contact_enabled: true } });
assert(contactActive.includes('name="contact[email]"'));
assert(contactActive.includes('name="contact[body]"'));
assert(contactActive.includes('type="submit"'));
assert(!contactActive.includes('fieldset disabled'));
const emptyCart = await renderTemplate('templates/cart.json');
assert(emptyCart.includes(text('hp_store.cart.empty_copy')));
rendered.set('/cart', emptyCart);
const image = { src: '/assets/hp-story-concept.webp', alt: 'Local QA fixture only' };
const variants = [{ id: 11111, title: 'Option A', available: true, price: 2500 }, { id: 22222, title: 'Option B', available: false, price: 3500 }];
const product = { title: 'Local QA fixture — not a real offer', url: languagePrefix + '/products/fixture-only', selected_or_first_available_variant: variants[0], variants, description: '<p>Local fixture content, not product evidence.</p>', images: [image, image], featured_image: image };
const productPreview = await renderTemplate('templates/product.json', { product, template: { name: 'product' } });
assert(productPreview.includes('name="add" class="hp-button" disabled'));
assert(productPreview.includes('loading="eager"'));
assert(productPreview.includes('fetchpriority="high"'));
assert(productPreview.includes('$25.00 USD'));
rendered.set('/products/fixture-only', productPreview);
const productActive = await renderTemplate('templates/product.json', { product, settings: { ...settings, hp_commerce_enabled: true } });
assert(!productActive.includes('name="add" class="hp-button" disabled'));
const soldOut = await renderTemplate('templates/product.json', { product: { ...product, selected_or_first_available_variant: variants[1] }, settings: { ...settings, hp_commerce_enabled: true } });
assert(soldOut.includes('name="add" class="hp-button" disabled'));
const cartFixture = { item_count: 2, total_price: 5000, taxes_included: false, items: [{ product: { title: product.title, has_only_default_variant: false }, variant: variants[0], image, url: product.url, quantity: 2, final_line_price: 5000 }] };
const filledCart = await renderTemplate('templates/cart.json', { cart: cartFixture });
assert(filledCart.includes('name="checkout" disabled'));
assert(filledCart.includes('name="updates[]" value="2"'));
assert(filledCart.includes(languagePrefix + '/cart/change?line=1&amp;quantity=0'));
const enabledCart = await renderTemplate('templates/cart.json', { cart: cartFixture, settings: { ...settings, hp_commerce_enabled: true } });
assert(!enabledCart.includes('name="checkout" disabled'));
const password = await renderTemplate('templates/password.json');
assert(!password.includes('contact[email]'));
assert(password.includes('name="password"'));
rendered.set('/password', password);
rendered.set('/404', await renderTemplate('templates/404.json'));
rendered.set('/', await renderTemplate('templates/index.json', { template: { name: 'index' } }));
let linkCount = 0;
const known = new Set([...rendered.keys(), '/pages/data-sharing-opt-out', '/account/login', '/cart/change', '/admin']);
for (const [route, main] of rendered) {
  const full = header + main + footer;
  const ids = [...full.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, route + ': unique IDs');
  for (const match of full.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)) assert(ids.includes(match[1]), route + ': input label ' + match[1]);
  for (const match of full.matchAll(/href=(["'])(.*?)\1/g)) {
    const href = match[2];
    if (!href.startsWith('/')) continue;
    let path = href.split(/[?#]/)[0] || '/';
    if (path.startsWith('/assets/')) continue;
    if (languagePrefix && path.startsWith('/pages/')) assert.fail(route + ': lost language prefix ' + path);
    if (languagePrefix && (path === languagePrefix || path.startsWith(languagePrefix + '/'))) path = path.slice(languagePrefix.length) || '/';
    assert(known.has(path), route + ': unresolved local route ' + path);
    linkCount++;
  }
}
const code = await read('assets/hp-store.js');
function runVariantFixture(commerce, available) {
  const listeners = {};
  const button = { disabled: !commerce, textContent: '' };
  const price = { textContent: '' };
  const option = { value: '11111', dataset: { available: String(available), price: '$25.00 USD' } };
  const select = { selectedOptions: [option], addEventListener: (event, cb) => { listeners[event] = cb; } };
  const form = { dataset: { commerce: String(commerce), preparing: 'Ordering disabled', add: 'Add', unavailable: 'Unavailable' }, closest: () => ({ querySelector: () => price }), querySelector: (s) => s === '[name="id"]' ? select : button, addEventListener: (event, cb) => { listeners[event] = cb; } };
  const document = { readyState: 'complete', querySelectorAll: (s) => s === '[data-hp-product-form]' ? [form] : [], addEventListener: () => {} };
  let url = '';
  vm.runInNewContext(code, { document, location: { href: 'https://example.test/products/fixture-only', origin: 'https://example.test' }, URL, history: { replaceState: (_, __, u) => { url = String(u); } } });
  listeners.change();
  assert.equal(button.disabled, !commerce || !available);
  assert.equal(price.textContent, '$25.00 USD');
  assert(url.includes('variant=11111'));
  let prevented = false;
  listeners.submit({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, !commerce || !available);
}
runVariantFixture(false, true);
runVariantFixture(true, true);
runVariantFixture(true, false);
const css = await read('assets/hp-base.css') + '\n' + await read('assets/hp-store.css') + '\n' + [...sources.values()].map((s) => extract(s, 'stylesheet')).join('\n');
const js = code + '\n' + [...sources.values()].map((s) => extract(s, 'javascript')).join('\n');
for (const [route, main] of rendered) {
  const isPassword = route === '/password';
  const doc = '<!doctype html><html lang="' + locale + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HiParcelo local review</title><style>body{margin:0}' + css + '</style></head><body>' + (isPassword ? '' : notice + header) + '<main id="MainContent">' + main + '</main>' + (isPassword ? '' : footer) + '<script>' + js.replaceAll('</script', '<\\/script') + '</script></body></html>';
  const filename = route === '/' ? 'index' : route.slice(1).replaceAll('/', '-');
  await writeFile(resolve(output, filename + '.html'), doc);
}
const changed = JSON.parse(process.env.HP_CHANGED_FILES || '[]');
const hashes = Object.fromEntries(await Promise.all(changed.map(async (path) => [path, createHash('md5').update(await read(path)).digest('hex')])));
const report = { pages_rendered: rendered.size, localized_string_checks: 'passed', links_checked: linkCount, unique_ids_and_labels: 'passed', purchase_gates: 'passed in off/on/sold-out fixtures', contact_gate: 'passed in off/on fixtures', cart_empty_and_filled: 'passed', tracking: 'secure-link guidance; no fake lookup', local_product_or_order_data: 'fixtures only; not sent to Shopify', browser_rendering: 'not performed by this script', native_checkout_and_contact_delivery: 'not performed', hashes };
await writeFile(resolve(output, 'validation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));


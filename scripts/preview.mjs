import { Liquid } from 'liquidjs';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, dirname, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'preview-output');
const read = (path) => readFile(resolve(root, path), 'utf8');
const parseJson = (source) => JSON.parse(source.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));
const stripBlocks = (source) => source.replace(/{%-?\s*(schema|stylesheet|javascript|doc)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}/g, '').replace(/{%-?\s*form\s+[^%]*%}/g, '<form data-preview-form>').replace(/{%-?\s*endform\s*-?%}/g, '</form>');
const extract = (source, name) => [...source.matchAll(new RegExp('{%-?\\s*' + name + '\\s*-?%}([\\s\\S]*?){%-?\\s*end' + name + '\\s*-?%}', 'g'))].map((match) => match[1]).join('\n');
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
await mkdir(resolve(output, 'snippets'), { recursive: true });
for (const filename of await readdir(resolve(root, 'snippets'))) {
  if (filename.endsWith('.liquid')) await writeFile(resolve(output, 'snippets', filename), stripBlocks(await read('snippets/' + filename)));
}
const engine = new Liquid({ root: resolve(output, 'snippets'), extname: '.liquid', strictFilters: true });
const translations = parseJson(await read('locales/en.default.json'));
engine.registerFilter('t', (key, ...parameters) => {
  let text = String(key).split('.').reduce((value, part) => value?.[part], translations);
  if (text && typeof text === 'object') {
    const count = parameters.find(parameter => Array.isArray(parameter) && parameter[0] === 'count')?.[1];
    text = Number(count) === 1 ? text.one : text.other;
  }
  if (typeof text !== 'string') throw new Error('Missing translation: ' + key);
  for (const parameter of parameters) {
    if (Array.isArray(parameter)) text = text.replaceAll('{{ ' + parameter[0] + ' }}', String(parameter[1]));
  }
  return text;
});
engine.registerFilter('asset_url', (name) => '/assets/' + name);
engine.registerFilter('stylesheet_tag', (url) => '<link rel="stylesheet" href="' + escape(url) + '">');
engine.registerFilter('json', (value) => JSON.stringify(value));
engine.registerFilter('default_errors', () => '');
engine.registerFilter('money_with_currency', (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100) + ' USD');
engine.registerFilter('image_url', (image) => image?.src || image);
engine.registerFilter('image_tag', (url, ...parameters) => {
  const attributes = Object.fromEntries(parameters.filter(Array.isArray));
  const allowed = ['alt', 'class', 'loading', 'fetchpriority', 'sizes'];
  return '<img src="' + escape(url) + '" width="1536" height="1024" ' + allowed.filter((key) => attributes[key] !== undefined).map((key) => key + '="' + escape(attributes[key]) + '"').join(' ') + (attributes.alt === undefined ? ' alt=""' : '') + '>';
});
const settings = parseJson(await read('config/settings_data.json')).current;
const globalSchema = parseJson(await read('config/settings_schema.json'));
for (const group of globalSchema) {
  for (const setting of group.settings || []) {
    if (settings[setting.id] === undefined && setting.default !== undefined) settings[setting.id] = setting.default;
  }
}
const context = {
  settings,
  shop: { name: 'HiParcelo', email: 'preview@example.test', policies: [], shipping_policy: null, refund_policy: null },
  cart: { item_count: 0 },
  routes: { root_url: '/', cart_url: '/cart' },
  template: { name: 'index' },
  request: { locale: { iso_code: 'en' } }
};
const home = parseJson(await read('templates/index.json'));
const header = parseJson(await read('sections/header-group.json'));
const footer = parseJson(await read('sections/footer-group.json'));
const pageContent = parseJson(await read('docs/store-pages.json')).pages;
const pageGroups = new Map();
for (const filename of await readdir(resolve(root, 'templates'))) {
  if (filename.startsWith('page') && filename.endsWith('.json')) pageGroups.set(filename, parseJson(await read('templates/' + filename)));
}
const templateNames = { contact: 'contact', about: 'hp-about', help: 'hp-help', shipping: 'hp-shipping', returns: 'hp-returns', privacy: 'hp-privacy', terms: 'hp-terms', cookies: 'hp-cookies', 'track-order': 'hp-tracking', 'first-find': 'hp-first-find', guides: 'hp-guides', 'guide-fit': 'hp-guide-fit', 'guide-before-ordering': 'hp-guide-order', 'guide-use-and-care': 'hp-guide-care', social: 'hp-social' };
const productGroup = parseJson(await read('templates/product.json'));
const cartGroup = parseJson(await read('templates/cart.json'));
const sources = new Map();
for (const group of [header, home, footer, ...pageGroups.values(), productGroup, cartGroup]) {
  for (const data of Object.values(group.sections)) {
    if (!sources.has(data.type)) sources.set(data.type, await read('sections/' + data.type + '.liquid'));
  }
}
const layoutSource = await read('layout/theme.liquid');
const styleAssets = [...new Set([...layoutSource.matchAll(/{{\s*'([^']+\.css)'\s*\|\s*asset_url\s*\|\s*stylesheet_tag/g)].map(match => match[1]))];
const css = (await Promise.all(styleAssets.map(name => read('assets/' + name)))).join('\n') + '\n' + [...sources.values()].map((source) => extract(source, 'stylesheet')).join('\n');
const javascript = [...sources.values()].map((source) => extract(source, 'javascript')).join('\n');
const sectionContext = (id, data) => {
  const source = sources.get(data.type);
  const schema = JSON.parse(extract(source, 'schema'));
  const sectionSettings = {};
  for (const setting of schema.settings || []) {
    if (setting.default !== undefined) sectionSettings[setting.id] = setting.default;
  }
  if (data.type === 'hi-delivery-journey' && process.env.HP_PREVIEW_JOURNEY_FILM) Object.assign(sectionSettings, JSON.parse(process.env.HP_PREVIEW_JOURNEY_FILM));
  const blocks = (data.block_order || []).map((blockId) => {
    const block = data.blocks[blockId];
    const blockSchema = schema.blocks?.find((item) => item.type === block.type);
    const blockSettings = {};
    for (const setting of blockSchema?.settings || []) {
      if (setting.default !== undefined) blockSettings[setting.id] = setting.default;
    }
    return { id: blockId, type: block.type, settings: { ...blockSettings, ...block.settings }, shopify_attributes: '' };
  });
  const resolvedSettings = { ...sectionSettings, ...data.settings };
  if (data.type === 'hi-delivery-journey' && process.env.HP_PREVIEW_JOURNEY_STYLE) resolvedSettings.presentation = process.env.HP_PREVIEW_JOURNEY_STYLE;
  return { id, settings: resolvedSettings, blocks };
};
const renderGroup = async (group, pageContext) => {
  let html = '';
  for (const id of group.order) {
    const data = group.sections[id];
    html += await engine.parseAndRender(stripBlocks(sources.get(data.type)), { ...pageContext, section: sectionContext(id, data) });
  }
  return html;
};
const render = async (product = false) => {
  const pageContext = product ? { ...context, template: { name: 'product' }, product: { title: 'Preview find', url: '/products/preview-find' } } : context;
  const headerHtml = await renderGroup(header, pageContext);
  const mainHtml = product ? '<main style="padding:60px 24px"><h1>Local journey test</h1><a href="/">Return to homepage</a></main>' : '<main id="MainContent">' + await renderGroup(home, pageContext) + '</main>';
  const footerHtml = await renderGroup(footer, pageContext);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HiParcelo homepage preview</title><style>html{scroll-behavior:smooth}body{margin:0;background:#fff}' + css + '</style><script src="/preview.js" defer></script></head><body>' + headerHtml + mainHtml + footerHtml + '</body></html>';
};
const homepage = await render();
const productPage = await render(true);
const renderPage = async (data, group) => {
  const pageContext = { ...context, template: { name: 'page' }, page: { title: data.title, handle: data.handle, content: data.body } };
  const contents = await renderGroup(header, pageContext) + '<main id="MainContent">' + await renderGroup(group, pageContext) + '</main>' + await renderGroup(footer, pageContext);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escape(data.title) + ' | HiParcelo</title><meta name="description" content="' + escape(data.description) + '"><style>body{margin:0}' + css + '</style><script src="/preview.js" defer></script></head><body>' + contents + '</body></html>';
};
const renderedPages = new Map();
for (const data of pageContent) {
  const templateName = templateNames[data.handle];
  const group = pageGroups.get(templateName ? 'page.' + templateName + '.json' : 'page.json');
  renderedPages.set('/pages/' + data.handle, await renderPage(data, group));
}
const renderFixture = async (group, extra = {}) => {
  const fixtureContext = { ...context, ...extra, template: { name: extra.product ? 'product' : 'cart' } };
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HiParcelo local fixture</title><style>body{margin:0}' + css + '</style></head><body>' + await renderGroup(header, fixtureContext) + '<main id="MainContent">' + await renderGroup(group, fixtureContext) + '</main>' + await renderGroup(footer, fixtureContext) + '</body></html>';
};
const sampleProduct = { title: 'Local preview item', url: '/products/preview-find', description: '<p>Local layout fixture. This is not an available product.</p>', selected_or_first_available_variant: { id: 1, price: 4900, available: true }, variants: [{ id: 1, title: 'Preview option', price: 4900, available: true }], images: [], featured_image: null };
const productFixture = await renderFixture(productGroup, { product: sampleProduct });
const cartEmpty = await renderFixture(cartGroup);
const cartFixture = await renderFixture(cartGroup, { cart: { item_count: 1, total_price: 4900, taxes_included: false, items: [{ url: sampleProduct.url, product: sampleProduct, variant: { title: 'Preview option' }, final_line_price: 4900, quantity: 1 }] } });
if (process.argv.includes('--write')) {
  await writeFile(resolve(output, 'index.html'), homepage.replace('<script src="/preview.js" defer></script>', '<script>' + javascript + '</script>').replaceAll('src="/assets/', 'src="../assets/').replaceAll('href="/assets/', 'href="../assets/'));
  console.log('Wrote preview-output/index.html from the actual homepage Liquid sections.');
} else {
  const types = { '.png': 'image/png', '.webp': 'image/webp', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    try {
      if (url.pathname === '/preview.js') {
        response.writeHead(200, { 'Content-Type': 'text/javascript' });
        response.end(javascript);
      } else if (url.pathname.startsWith('/assets/')) {
        const assetRoot = resolve(root, 'assets');
        const path = resolve(assetRoot, decodeURIComponent(url.pathname.slice('/assets/'.length)));
        if (!path.startsWith(assetRoot + sep)) throw new Error('Invalid asset path');
        const bytes = await readFile(path);
        response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
        response.end(bytes);
      } else if (url.pathname === '/' || url.pathname === '/products/preview-find') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(url.pathname === '/' ? homepage : productPage);
      } else if (renderedPages.has(url.pathname)) {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(renderedPages.get(url.pathname));
      } else if (url.pathname === '/products/layout-fixture' || url.pathname === '/cart') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(url.pathname === '/products/layout-fixture' ? productFixture : url.searchParams.has('filled') ? cartFixture : cartEmpty);
      } else {
        response.writeHead(404);
        response.end('Not part of the local homepage preview.');
      }
    } catch {
      response.writeHead(404);
      response.end('Not found.');
    }
  });
  const port = Number(process.env.HP_PREVIEW_PORT || 4173);
  server.listen(port, '127.0.0.1', () => console.log('Homepage preview: http://127.0.0.1:' + port));
}

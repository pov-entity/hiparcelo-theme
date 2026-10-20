import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'locales/en.default.json');
const locale = JSON.parse(await readFile(file, 'utf8'));
const pages = JSON.parse(await readFile(resolve(root, 'docs/store-pages.json'), 'utf8')).pages;
locale.hp_content = {};
const markup = ['{% doc %}', 'Renders owned page markup with length-limited text translations.', '@param {object} page - Current Shopify page.', '{% enddoc %}', '{%- case page.handle -%}'];
for (const page of pages) {
  const key = page.handle.replaceAll('-', '_');
  const values = {
    title: page.title,
    description: page.description
  };
  let index = 0;
  const html = (page.body.match(/<[^>]*>|[^<]+/g) || []).map(token => {
    if (token.startsWith('<') || !token.trim()) return token;
    const name = 'copy_' + ++index;
    values[name] = token;
    return "{{ 'hp_content." + key + '.' + name + "' | t }}";
  }).join('');
  locale.hp_content[key] = values;
  markup.push("{%- when '" + page.handle + "' -%}", html);
}
markup.push('{%- endcase -%}', '');
let translations = 0;
const validate = (value, key = '') => {
  if (typeof value === 'object') for (const [name, text] of Object.entries(value)) validate(text, key + '.' + name);
  else {
    translations++;
    if (String(value).length > 1000) throw new Error('Shopify translation value exceeds 1000 characters: ' + key);
  }
};
validate(locale);
if (translations > 3400) throw new Error('Shopify translation count exceeds 3400');
await writeFile(file, JSON.stringify(locale, null, 2) + '\n');
await writeFile(resolve(root, 'snippets/hp-page-copy.liquid'), markup.join('\n'));
console.log('Built ' + pages.length + ' pages; ' + translations + ' locale entries satisfy Shopify limits.');

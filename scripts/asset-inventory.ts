import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { PNG } from 'pngjs';
import { readBundle } from '../src/dance/bundle';
export const revision = 'eaf266f54d5c8a9eb06174f13a85174e2745e034';
export const assetRoot = 'public/assets/shroom';
export const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const parser = new (new JSDOM('').window.DOMParser)();
export function xml(text: string, root: string): Document {
  const document = parser.parseFromString(text, 'text/xml');
  if (document.querySelector('parsererror') || document.documentElement.tagName !== root) throw new Error(`XML ${root} inválido.`);
  return document;
}
export function libraryIds(map: string): string[] {
  const ids = [...xml(map, 'map').querySelectorAll('lib')].map(el => el.getAttribute('id') ?? '');
  if (!ids.length || ids.some(id => !/^[a-zA-Z0-9_-]+$/.test(id))) throw new Error('Figuremap inválido.');
  return [...new Set(['hh_human_face', 'hh_human_item', 'hh_human_body', ...ids])];
}
export function validateBundle(data: Uint8Array) {
  const files = readBundle(data);
  const manifest = files.get('manifest.bin');
  if (!manifest) throw new Error('Manifest ausente na biblioteca.');
  const doc = xml(new TextDecoder().decode(manifest), 'manifest');
  for (const asset of doc.querySelectorAll('assets > asset')) {
    const name = asset.getAttribute('name');
    if (name?.endsWith('__REGPOINTS')) continue;
    if (asset.getAttribute('mimeType') === 'text/xml') {
      const content = files.get(`${name}.bin`);
      if (!content?.length || parser.parseFromString(new TextDecoder().decode(content), 'text/xml').querySelector('parsererror')) throw new Error(`XML interno ausente ou inválido: ${name}`);
      continue;
    }
    const image = files.get(`${name}.png`);
    if (!image) throw new Error(`Imagem ausente: ${name}`);
    try { PNG.sync.read(Buffer.from(image), { checkCRC: true }); }
    catch { throw new Error(`Imagem inválida: ${name}`); }
  }
}
export async function checkAssets(root = assetRoot) {
  try {
    const inventory = JSON.parse(await readFile(join(root, 'inventory.json'), 'utf8'));
    if (inventory.revision !== revision || !inventory.files) throw new Error('Inventário desatualizado.');
    const map = await readFile(join(root, 'figuremap.xml'), 'utf8');
    xml(await readFile(join(root, 'figuredata.xml'), 'utf8'), 'figuredata');
    const required = ['figuremap.xml', 'figuredata.xml', ...libraryIds(map).map(id => `figure/${id}.wsproom`)];
    for (const name of required) {
      const bytes = await readFile(join(root, name));
      if (!bytes.length || inventory.files[name] !== hash(bytes)) throw new Error(`Asset ausente ou alterado: ${name}`);
      if (name.endsWith('.wsproom')) validateBundle(bytes);
    }
    return required.length;
  } catch (error) {
    throw new Error(`Assets obrigatórios inválidos. Execute npm run assets:prepare. ${error instanceof Error ? error.message : error}`);
  }
}

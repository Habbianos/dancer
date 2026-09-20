import { readBundle, writeBundle } from '../src/dance/bundle';
import { xml } from './asset-inventory';

/** Some official SWFs retain manifest entries for symbols that no longer exist.
 * Remove only entries proved absent from the source SWF, never failed extractions.
 */
export function normalizeBundle(bytes: Uint8Array, sourceSymbols: Set<string>): Uint8Array {
  const files = readBundle(bytes);
  const manifest = files.get('manifest.bin');
  if (!manifest) throw new Error('Manifest ausente.');
  const doc = xml(new TextDecoder().decode(manifest), 'manifest');
  const removed = new Set<string>();
  for (const asset of doc.querySelectorAll('assets > asset')) {
    const name = asset.getAttribute('name') ?? '';
    const extension = asset.getAttribute('mimeType') === 'text/xml' ? 'bin' : 'png';
    if (!files.has(`${name}.${extension}`) && !sourceSymbols.has(name)) { removed.add(name); asset.remove(); }
  }
  for (const alias of doc.querySelectorAll('aliases > alias')) {
    if (removed.has(alias.getAttribute('link') ?? '')) alias.remove();
  }
  files.set('manifest.bin', new TextEncoder().encode(doc.documentElement.outerHTML));
  return writeBundle(files);
}

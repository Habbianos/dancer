import type { Attributes, DanceDocument } from './document';
import { readBundle, writeBundle } from './bundle';
const numeric = ['frame', 'dx', 'dy', 'dd'] as const;
const attrs = (el: Element, excluded: string[]): Attributes => Object.fromEntries([...el.attributes].filter(a => !excluded.includes(a.name)).map(a => [a.name, a.value]));
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const attributes = (values: Record<string, string | number>) => Object.entries(values).map(([key, value]) => `${key}="${escape(String(value))}"`).join(' ');
export function parseDance(input: Uint8Array | string): DanceDocument {
  if (typeof input !== 'string') {
    if (input.byteLength > 8_000_000) throw new Error('Arquivo muito grande.');
    if (input[0] === 1) {
      const xml = readBundle(input).get('animation.bin');
      if (!xml) throw new Error('animation.bin não encontrado.');
      input = new TextDecoder().decode(xml);
    } else input = new TextDecoder().decode(input);
  }
  if (input.length > 8_000_000 || /<!DOCTYPE|<!ENTITY/i.test(input)) throw new Error('XML não suportado.');
  const xml = new DOMParser().parseFromString(input, 'text/xml');
  const root = xml.documentElement;
  if (xml.querySelector('parsererror') || root.tagName !== 'animation') throw new Error('XML de animação inválido.');
  const children = [...root.children];
  if (children.some(el => el.tagName !== 'frame')) throw new Error('Apenas animações com frames de partes do corpo são suportadas.');
  const frames = children.map(frame => {
    const ids = new Set<string>();
    const parts = [...frame.children].map(part => {
      const id = part.getAttribute('id') ?? '';
      if (part.tagName !== 'bodypart' || !id || ids.has(id)) throw new Error('Parte do corpo inválida ou repetida.');
      ids.add(id);
      const values = Object.fromEntries(numeric.map(key => {
        const raw = part.getAttribute(key) ?? '0';
        const value = Number(raw);
        if (!/^-?\d+$/.test(raw) || !Number.isSafeInteger(value) || Math.abs(value) > 10000 || (key === 'frame' && value < 0)) throw new Error(`Valor inválido: ${key}.`);
        return [key, value];
      })) as Record<typeof numeric[number], number>;
      return { id, action: part.getAttribute('action') ?? 'Default', ...values, extra: attrs(part, ['id', 'action', ...numeric]) };
    });
    if (!parts.length) throw new Error('Frame sem partes do corpo.');
    return { parts, extra: attrs(frame, []) };
  });
  if (!frames.length || frames.length > 2048) throw new Error('Use entre 1 e 2048 frames.');
  return { name: root.getAttribute('name') ?? 'dance.custom', description: root.getAttribute('desc') ?? '', extra: attrs(root, ['name', 'desc']), frames };
}
export function toXml(dance: DanceDocument): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<animation ${attributes({ ...dance.extra, name: dance.name, desc: dance.description })}>\n${dance.frames.map(frame => `  <frame${Object.keys(frame.extra).length ? ' ' + attributes(frame.extra) : ''}>\n${frame.parts.map(({ extra, ...part }) => `    <bodypart ${attributes({ ...extra, ...part })} />`).join('\n')}\n  </frame>`).join('\n')}\n</animation>\n`;
}
export function toShroom(dance: DanceDocument): Uint8Array {
  const encode = (text: string) => new TextEncoder().encode(text);
  return writeBundle(new Map([
    ['animation.bin', encode(toXml(dance))],
    ['manifest.bin', encode(`<?xml version="1.0"?><manifest><library id="${escape(dance.name)}" version="0.1"><assets/><aliases/></library></manifest>`)],
  ]));
}

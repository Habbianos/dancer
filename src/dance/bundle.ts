const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
export function readBundle(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const ensure = (n: number) => { if (offset + n > bytes.length) throw new Error('Arquivo SHROOM truncado.'); };
  const uint = (n: 1 | 2 | 4) => { ensure(n); const value = n === 1 ? view.getUint8(offset) : n === 2 ? view.getUint16(offset) : view.getUint32(offset); offset += n; return value; };
  if (uint(1) !== 1) throw new Error('Versão SHROOM não suportada.');
  const count = uint(2);
  const files = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i++) {
    const length = uint(2); ensure(length);
    const name = decoder.decode(bytes.subarray(offset, offset + length)); offset += length;
    const size = uint(4); ensure(size);
    if (!name || files.has(name)) throw new Error('Entrada SHROOM inválida.');
    files.set(name, bytes.slice(offset, offset + size)); offset += size;
  }
  if (offset !== bytes.length) throw new Error('Dados excedentes no SHROOM.');
  return files;
}
export function writeBundle(files: Map<string, Uint8Array>): Uint8Array {
  const entries = [...files].map(([name, data]) => [encoder.encode(name), data] as const);
  const output = new Uint8Array(3 + entries.reduce((sum, [name, data]) => sum + 6 + name.length + data.length, 0));
  const view = new DataView(output.buffer);
  output[0] = 1; view.setUint16(1, entries.length);
  let offset = 3;
  for (const [name, data] of entries) {
    view.setUint16(offset, name.length); offset += 2;
    output.set(name, offset); offset += name.length;
    view.setUint32(offset, data.length); offset += 4;
    output.set(data, offset); offset += data.length;
  }
  return output;
}

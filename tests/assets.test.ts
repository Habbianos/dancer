// @vitest-environment node
import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkAssets, validateBundle } from '../scripts/asset-inventory';
import { writeBundle } from '../src/dance/bundle';
import { normalizeBundle } from '../scripts/normalize-bundle';
it('remove referências órfãs do manifest apenas se não existem no SWF original', () => {
  const bytes = writeBundle(new Map([['manifest.bin', new TextEncoder().encode('<manifest><library><assets><asset name="old"/></assets></library></manifest>')]]));
  expect(() => validateBundle(normalizeBundle(bytes, new Set()))).not.toThrow();
  expect(() => validateBundle(normalizeBundle(bytes, new Set(['old'])))).toThrow();
});
it('aceita marcadores REGPOINTS sem imagem, mas exige sprites renderizáveis', () => {
  const encode = (value: string) => new TextEncoder().encode(value);
  const files = new Map([['manifest.bin', encode('<manifest><library><assets><asset name="h_std__2074__REGPOINTS"/><asset name="h_std_hd_1_0_0"/></assets></library></manifest>')]]);
  expect(() => validateBundle(writeBundle(files))).toThrow();
  const png = new Uint8Array(24); png[0] = 137; png[1] = 80;
  files.set('h_std_hd_1_0_0.png', png);
  expect(() => validateBundle(writeBundle(files))).not.toThrow();
});
it('valida paletas XML como arquivos binários de texto, não como PNG', () => {
  const encode = (value: string) => new TextEncoder().encode(value);
  const files = new Map([
    ['manifest.bin', encode('<manifest><library><assets><asset name="palette" mimeType="text/xml"/></assets></library></manifest>')],
    ['palette.bin', encode('<palette/>')],
  ]);
  expect(() => validateBundle(writeBundle(files))).not.toThrow();
  files.delete('palette.bin');
  expect(() => validateBundle(writeBundle(files))).toThrow();
});
it('rejeita assets ausentes, pasta vazia e inventário incompleto', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dancer-assets-'));
  try {
    await expect(checkAssets(join(dir, 'missing'))).rejects.toThrow();
    await expect(checkAssets(dir)).rejects.toThrow();
    await writeFile(join(dir, 'inventory.json'), JSON.stringify({ revision: 'bad', files: {} }));
    await expect(checkAssets(dir)).rejects.toThrow();
    await mkdir(join(dir, 'figure'));
    await writeFile(join(dir, 'figuremap.xml'), '<map><lib id="missing"/></map>');
    await writeFile(join(dir, 'figuredata.xml'), '');
    await expect(checkAssets(dir)).rejects.toThrow();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

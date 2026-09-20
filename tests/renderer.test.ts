import { expect, it, vi } from 'vitest';
import { newDance } from '../src/dance/document';

const state = vi.hoisted(() => ({ requests: [] as { look: string; resolve: (value: object) => void; reject: (error: Error) => void }[] }));
vi.mock('pixi.js', () => ({
  TextureSource: { defaultOptions: {} },
  Graphics: class { moveTo() { return this; } lineTo() { return this; } closePath() { return this; } stroke() { return this; } },
  Application: class {
    canvas = document.createElement('canvas'); stage = { addChild() {} }; ticker = { add() {} };
    async init() {} destroy() {}
  },
}));
vi.mock('@wiredsnippets/shroom/dist/objects/room/Room', () => ({ Room: class {
  scale = { set() {} }; position = { set() {} }; eventManager = {};
  addChild() {} destroy() {} getPosition() { return { x: 0, y: 0 }; }
} }));
vi.mock('@wiredsnippets/shroom/dist/objects/avatar/BaseAvatar', () => ({ BaseAvatar: class {
  onLoad: () => void;
  constructor(options: { onLoad: () => void }) { this.onLoad = options.onLoad; }
  set dependencies(value: unknown) { queueMicrotask(() => this.onLoad()); }
  destroy() {}
} }));
vi.mock('../src/preview/dance-loader', () => ({ createDanceLoader: () => ({
  actions: [], setDance() {}, loader: { getAvatarDrawDefinition: (options: { look: string }) => new Promise((resolve, reject) => state.requests.push({ look: options.look, resolve, reject })) },
}) }));
import { createPreview } from '../src/preview/renderer';

it('preserva última aparência confirmada após dois pedidos concorrentes e falha do mais recente', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  state.requests.length = 0;
  const preview = await createPreview(document.createElement('div'), newDance());
  const initial = preview.setFigure('hd-180-1'); state.requests[0].resolve({}); await initial;
  const old = preview.setFigure('hd-181-1');
  const recent = preview.setFigure('hd-182-1');
  state.requests[2].reject(new Error('Falha de rede'));
  await expect(recent).rejects.toThrow('Falha de rede');
  state.requests[1].resolve({}); await old;
  const rotation = preview.setDirection(3);
  expect(state.requests[3].look).toBe('hd-180-1');
  state.requests[3].resolve({}); await rotation;
  const edited = preview.setDance(newDance());
  expect(state.requests[4].look).toBe('hd-180-1');
  state.requests[4].resolve({}); await edited;
  preview.destroy(); vi.unstubAllGlobals();
});

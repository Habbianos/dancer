import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { newDance, type DanceDocument } from '../src/dance/document';
import { parseDance, toXml } from '../src/dance/codec';

const state = vi.hoisted(() => ({ factory: vi.fn() }));
vi.mock('../src/preview/renderer', () => ({ createPreview: state.factory }));
const captureListeners = () => vi.spyOn(window, 'addEventListener');
let listeners: ReturnType<typeof captureListeners>;
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', () => 0);
  const source = readFileSync('src/pages/index.astro', 'utf8');
  document.body.innerHTML = source.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script>[\s\S]*?<\/script>/g, '');
  const dance = newDance(); dance.name = 'dance.initial';
  localStorage.setItem('habbo-dancer:v1', JSON.stringify({ xml: toXml(dance) }));
  state.factory.mockReset();
  listeners = captureListeners();
});
afterEach(() => {
  for (const [type, listener] of listeners.mock.calls) window.removeEventListener(type, listener);
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllTimers(); vi.useRealTimers();
});

it('sincroniza o documento substituído enquanto a criação da prévia está pendente', async () => {
  let release!: (preview: object) => void;
  const setDance = vi.fn(async (_dance: DanceDocument) => {});
  state.factory.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  await import('../src/editor/controller');
  await vi.waitFor(() => expect(state.factory).toHaveBeenCalledOnce());
  expect(state.factory.mock.calls[0][1].name).toBe('dance.initial');
  document.getElementById('new')!.click();
  await vi.advanceTimersByTimeAsync(100);
  release({ actions: ['Default'], setDance, setDirection: async () => {}, setFigure: async () => {}, seek() {}, destroy() {} });
  await vi.waitFor(() => expect(setDance).toHaveBeenCalled());
  expect(setDance.mock.calls.at(-1)![0].name).toBe('dance.custom');
});

it('mantém quatro partes fixas e preenche partes ausentes com zero ao restaurar', async () => {
  const dance = newDance();
  dance.frames[0].parts = [
    { ...dance.frames[0].parts[0], dx: 7 },
    { ...dance.frames[0].parts[1], id: 'leftleg', dx: 9 },
    { ...dance.frames[0].parts[2], id: 'rightleg', dx: 9 },
  ];
  localStorage.setItem('habbo-dancer:v1', JSON.stringify({ xml: toXml(dance) }));
  state.factory.mockImplementation(() => new Promise(() => {}));
  await import('../src/editor/controller');
  await vi.waitFor(() => expect(state.factory).toHaveBeenCalledOnce());
  expect(document.querySelectorAll('#parts tr')).toHaveLength(4);
  expect(document.querySelector('#parts button, #add-part, #part-id')).toBeNull();
  window.dispatchEvent(new Event('pagehide'));
  const saved = parseDance(JSON.parse(localStorage.getItem('habbo-dancer:v1')!).xml);
  expect(saved.frames[0].parts.map(part => part.id)).toEqual(['head', 'torso', 'leftarm', 'rightarm']);
  expect(saved.frames[0].parts[0].dx).toBe(7);
  for (const part of saved.frames[0].parts.slice(1)) {
    expect(part).toMatchObject({ action: 'Default', frame: 0, dx: 0, dy: 0, dd: 0 });
  }
});

it('salva a edição pendente ao sair antes dos 250 ms do autosave', async () => {
  state.factory.mockImplementation(() => new Promise(() => {}));
  await import('../src/editor/controller');
  await vi.waitFor(() => expect(state.factory).toHaveBeenCalledOnce());
  document.getElementById('duplicate')!.click();
  window.dispatchEvent(new Event('pagehide'));
  const saved = JSON.parse(localStorage.getItem('habbo-dancer:v1')!);
  expect(parseDance(saved.xml).frames).toHaveLength(2);
});

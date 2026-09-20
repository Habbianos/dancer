import { parseDance, toShroom, toXml } from '../dance/codec';
import { newDance, duplicateFrame, removeFrame, moveFrame, type DanceDocument, type BodyPart } from '../dance/document';
import { Playback } from '../preview/ticker';
import { lookupFigure } from '../avatar/lookup';
import { Buffer } from 'buffer';

// ByteBuffer in the upstream browser bundle expects the Buffer global.
Object.assign(globalThis, { Buffer });
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const select = (id: string) => $<HTMLSelectElement>(id);
const names: Record<string, string> = { head: 'Cabeça', torso: 'Tronco', leftarm: 'Braço E', rightarm: 'Braço D', leftleg: 'Perna E', rightleg: 'Perna D' };
const clock = new Playback();
const storageKey = 'habbo-dancer:v1';
let dance = newDance();
let figure = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80';
let direction = 2;
let preview: Awaited<ReturnType<typeof import('../preview/renderer')['createPreview']>> | undefined;
let actions: string[] = ['Default', 'Move', 'Wave', 'CarryItem'];
let lookup: AbortController | undefined;
let appearanceRevision = 0;
let presetRevision = 0;
let saveTimer: ReturnType<typeof setTimeout>;
let renderTimer: ReturnType<typeof setTimeout>;
function status(message = '') { $('status').textContent = message; }
function error(reason: unknown) { status(reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.'); }
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ xml: toXml(dance), figure, direction }));
      $('saved').textContent = 'Salvo neste navegador';
    } catch { $('saved').textContent = 'Exporte para salvar'; }
  }, 250);
}
function pause() { clock.playing = false; syncPlay(); }
function syncPlay() { $('play').textContent = clock.playing ? 'Ⅱ' : '▶'; $('play').setAttribute('aria-label', clock.playing ? 'Pausar' : 'Reproduzir'); }
function updatePreview() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => preview?.setDance(structuredClone(dance)).then(() => preview?.seek(clock.frame)).catch(error), 60);
}
function changed() {
  select('preset').value = 'custom';
  persist(); updatePreview();
}
function frameButtons() {
  const fragment = document.createDocumentFragment();
  dance.frames.forEach((_, index) => {
    const button = document.createElement('button');
    button.textContent = String(index + 1).padStart(2, '0');
    button.dataset.frame = String(index);
    button.setAttribute('aria-label', `Frame ${index + 1}`);
    button.onclick = () => { pause(); clock.seek(index); };
    fragment.append(button);
  });
  $('frames').replaceChildren(fragment);
  clock.length = dance.frames.length;
  input('timeline').max = String(clock.length - 1);
  $('frame-count').textContent = `${clock.length} frame${clock.length > 1 ? 's' : ''}`;
}
function drawParts() {
  const rows = dance.frames[clock.frame].parts.map((part, index) => {
    const row = document.createElement('tr');
    const label = document.createElement('td'); label.textContent = names[part.id] ?? part.id; row.append(label);
    const actionCell = document.createElement('td');
    const action = document.createElement('select'); action.setAttribute('aria-label', `Ação ${names[part.id] ?? part.id}`);
    for (const id of [...new Set([...actions, part.action])]) { const option = new Option(id, id); action.append(option); }
    action.value = part.action;
    action.onchange = () => { pause(); part.action = action.value; changed(); };
    actionCell.append(action); row.append(actionCell);
    for (const key of ['frame', 'dx', 'dy', 'dd'] as const) {
      const cell = document.createElement('td');
      const field = document.createElement('input'); field.type = 'number'; field.step = '1'; field.min = key === 'frame' ? '0' : '-10000'; field.max = '10000'; field.value = String(part[key]);
      field.setAttribute('aria-label', `${names[part.id] ?? part.id} ${key}`);
      field.onfocus = pause;
      field.oninput = () => {
        if (field.value === '' || !field.checkValidity() || !Number.isInteger(field.valueAsNumber)) return;
        part[key] = field.valueAsNumber; changed();
      };
      field.onblur = () => { field.value = String(part[key]); };
      cell.append(field); row.append(cell);
    }
    const cell = document.createElement('td'); const remove = document.createElement('button'); remove.textContent = '×'; remove.title = `Remover ${label.textContent}`; remove.setAttribute('aria-label', remove.title); remove.disabled = dance.frames[clock.frame].parts.length <= 1;
    remove.onclick = () => { pause(); dance.frames[clock.frame].parts.splice(index, 1); drawParts(); changed(); };
    cell.append(remove); row.append(cell); return row;
  });
  $('parts').replaceChildren(...rows);
}
clock.onFrame = frame => {
  preview?.seek(frame);
  input('timeline').value = String(frame);
  $('timecode').textContent = `${String(frame + 1).padStart(2, '0')} / ${String(clock.length).padStart(2, '0')}`;
  $('frame-label').textContent = `Frame ${String(frame + 1).padStart(2, '0')}`;
  for (const button of $('frames').children) button.setAttribute('aria-current', String((button as HTMLElement).dataset.frame === String(frame)));
  $<HTMLButtonElement>('previous-order').disabled = frame === 0;
  $<HTMLButtonElement>('next-order').disabled = frame === clock.length - 1;
  $<HTMLButtonElement>('delete').disabled = clock.length === 1;
  drawParts();
};
function replace(next: DanceDocument, frame = 0) {
  pause(); dance = next;
  input('dance-name').value = dance.name; input('dance-desc').value = dance.description;
  frameButtons(); clock.seek(frame); updatePreview(); persist();
}
async function loadPreset(number: string) {
  const request = ++presetRevision;
  const response = await fetch(`${import.meta.env.BASE_URL}dances/Dance${number}.shroom`);
  if (!response.ok) throw new Error('Não foi possível abrir esta dança.');
  const next = parseDance(new Uint8Array(await response.arrayBuffer()));
  if (request !== presetRevision) return;
  replace(next); select('preset').value = number;
}
select('preset').onchange = () => { if (select('preset').value !== 'custom') loadPreset(select('preset').value).catch(error); };
$('new').onclick = () => { presetRevision++; replace(newDance()); changed(); };
$('import').onclick = () => input('file').click();
input('file').onchange = async () => {
  const file = input('file').files?.[0]; if (!file) return;
  try { const next = parseDance(new Uint8Array(await file.arrayBuffer())); presetRevision++; replace(next); changed(); status(); } catch (reason) { error(reason); }
  input('file').value = '';
};
$('export').onclick = () => {
  const format = select('format').value;
  const content = format === 'xml' ? toXml(dance) : toShroom(dance);
  const blob = new Blob([content as BlobPart], { type: format === 'xml' ? 'application/xml' : 'application/octet-stream' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `${dance.name.replace(/[^\w.-]/g, '_') || 'dance'}.${format}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
for (const [id, key] of [['dance-name', 'name'], ['dance-desc', 'description']] as const) input(id).oninput = () => { dance[key] = input(id).value; changed(); };
$('duplicate').onclick = () => { if (dance.frames.length >= 2048) return; replace(duplicateFrame(dance, clock.frame), clock.frame + 1); changed(); };
$('add').onclick = () => { if (dance.frames.length >= 2048) return; dance.frames.splice(clock.frame + 1, 0, newDance().frames[0]); replace(dance, clock.frame + 1); changed(); };
$('delete').onclick = () => { const index = clock.frame; replace(removeFrame(dance, index), Math.min(index, dance.frames.length - 2)); changed(); };
for (const [id, delta] of [['previous-order', -1], ['next-order', 1]] as const) $(id).onclick = () => { const next = clock.frame + delta; replace(moveFrame(dance, clock.frame, next), next); changed(); };
$('add-part').onclick = () => {
  pause(); const id = select('part-id').value; const parts = dance.frames[clock.frame].parts;
  if (parts.some(part => part.id === id)) { status('Esta parte já está no frame.'); return; }
  parts.push({ id, action: 'Default', frame: 0, dx: 0, dy: 0, dd: 0, extra: {} }); drawParts(); changed(); status();
};
$('play').onclick = () => { clock.playing = !clock.playing; syncPlay(); };
input('timeline').oninput = () => { pause(); clock.seek(Number(input('timeline').value)); };
select('fps').onchange = () => { clock.fps = Number(select('fps').value); };
for (const [id, delta] of [['rotate-left', -1], ['rotate-right', 1]] as const) $(id).onclick = () => {
  direction = (direction + delta + 8) % 8; $('direction').textContent = `${direction} / 7`;
  preview?.setDirection(direction).catch(error); persist();
};
select('appearance-mode').onchange = () => {
  lookup?.abort(); appearanceRevision++;
  const user = select('appearance-mode').value === 'user'; select('hotel').hidden = !user;
  input('appearance-value').value = user ? '' : figure;
  input('appearance-value').placeholder = user ? 'Nome no hotel' : 'Figurestring';
};
$('appearance').onsubmit = async event => {
  event.preventDefault(); lookup?.abort(); lookup = new AbortController();
  const revision = ++appearanceRevision;
  try {
    status();
    const next = select('appearance-mode').value === 'user' ? await lookupFigure(select('hotel').value, input('appearance-value').value, lookup.signal) : input('appearance-value').value.trim();
    if (revision !== appearanceRevision) return;
    if (!preview) throw new Error('Aguarde o carregamento da prévia.');
    await preview.setFigure(next);
    if (revision !== appearanceRevision) return;
    figure = next; persist();
  } catch (reason) { if (!lookup.signal.aborted && revision === appearanceRevision) error(reason); }
};
let previous = performance.now();
const tick = (now: number) => { clock.advance(Math.min(now - previous, 250)); previous = now; requestAnimationFrame(tick); };
requestAnimationFrame(tick);
window.addEventListener('keydown', event => {
  if (event.code === 'Space' && (event.target === document.body || event.target === $('stage'))) { event.preventDefault(); $('play').click(); }
});
window.addEventListener('pagehide', () => { lookup?.abort(); preview?.destroy(); });
async function start() {
  let restored = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (saved?.xml) { dance = parseDance(saved.xml); figure = typeof saved.figure === 'string' ? saved.figure : figure; direction = Number.isInteger(saved.direction) ? (saved.direction + 8) % 8 : 2; restored = true; }
  } catch { /* invalid or inaccessible draft: load the first preset */ }
  if (restored) { replace(dance); select('preset').value = 'custom'; } else await loadPreset('1');
  input('appearance-value').value = figure; $('direction').textContent = `${direction} / 7`;
  const { createPreview } = await import('../preview/renderer');
  preview = await createPreview($('stage'), dance); actions = preview.actions; drawParts();
  await preview.setDirection(direction); await preview.setFigure(figure); preview.seek(clock.frame);
  $('loading').hidden = true;
}
start().catch(reason => { $('loading').textContent = 'Prévia indisponível'; error(reason); });

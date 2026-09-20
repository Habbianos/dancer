import { Application, Graphics, TextureSource } from 'pixi.js';
import { Room } from '@wiredsnippets/shroom/dist/objects/room/Room';
import { BaseAvatar } from '@wiredsnippets/shroom/dist/objects/avatar/BaseAvatar';
import type { AvatarAction } from '@wiredsnippets/shroom/dist/objects/avatar/enum/AvatarAction';
import { createDanceLoader } from './dance-loader';
import { ManualTicker } from './ticker';
import type { DanceDocument } from '../dance/document';

export async function createPreview(host: HTMLElement, dance: DanceDocument) {
  TextureSource.defaultOptions.scaleMode = 'nearest';
  const app = new Application();
  await app.init({ backgroundAlpha: 0, antialias: false, preference: 'webgl', resizeTo: host, resolution: window.devicePixelRatio || 1, autoDensity: true });
  host.appendChild(app.canvas);
  app.canvas.setAttribute('aria-label', 'Avatar dançando no centro do quarto 3 por 3');
  const ticker = new ManualTicker();
  const bridge = createDanceLoader(`${import.meta.env.BASE_URL}assets/shroom`, dance);
  const room = new Room({
    application: app, animationTicker: ticker, avatarLoader: bridge.loader,
    furnitureLoader: { loadFurni: async () => { throw new Error('Este editor não usa furnis.'); } },
    configuration: {}, tilemap: '000\n000\n000',
  });
  room.hideWalls = true;
  room.hideTileCursor = true;
  room.floorColor = '#e5e3df';
  room.tileHeight = 8;
  app.stage.addChild(room);
  const grid = new Graphics();
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const p = room.getPosition(x, y, 0);
    grid.moveTo(p.x, p.y + 16).lineTo(p.x + 32, p.y).lineTo(p.x + 64, p.y + 16).lineTo(p.x + 32, p.y + 32).closePath();
  }
  grid.stroke({ width: 0.5, color: 0xc7c8c0, alpha: 0.7 });
  room.addChild(grid);
  let avatar: BaseAvatar | undefined;
  let frame = 0;
  let request = 0;
  let destroyed = false;
  let look = '';
  let committedLook = '';
  let direction = 2;
  const layout = () => {
    const scale = host.clientWidth < 430 ? 1.5 : 2;
    room.scale.set(scale);
    room.position.set(host.clientWidth / 2 - 32 * scale, host.clientHeight / 2 - 15 * scale);
  };
  const observer = new ResizeObserver(layout); observer.observe(host); layout();
  app.ticker.add(() => ticker.flush());
  async function render() {
    if (!look || destroyed) return;
    const ticket = ++request;
    const options = { look, direction, headDirection: direction, actions: new Set<AvatarAction>(), effect: 'editor' };
    const result = await bridge.loader.getAvatarDrawDefinition(options);
    if (ticket !== request || destroyed) return;
    const position = room.getPosition(1, 1, 0);
    const next = new BaseAvatar({ look: options, position, zIndex: 1000, onLoad: () => {
      if (ticket !== request || destroyed) { next.destroy(); return; }
      avatar?.destroy(); avatar = next; committedLook = options.look;
      room.addChild(next);
      // Each XML effect frame is repeated twice by wsproom's AvatarBodyPartList.
      next.currentFrame = frame * 2;
      ticker.flush();
    } });
    next.dependencies = { eventManager: room.eventManager, animationTicker: ticker, avatarLoader: { getAvatarDrawDefinition: async () => result } };
  }
  return {
    actions: bridge.actions,
    async setDance(next: DanceDocument) { bridge.setDance(next); await render(); },
    async setFigure(next: string) {
      if (!/^[a-z]{2}-\d+(?:-\d+)*(?:\.[a-z]{2}-\d+(?:-\d+)*)*$/.test(next)) throw new Error('Figurestring inválida.');
      look = next;
      try { await render(); } catch (reason) { if (look === next) look = committedLook; throw reason; }
    },
    async setDirection(next: number) { direction = ((next % 8) + 8) % 8; await render(); },
    seek(next: number) { frame = next; if (avatar) avatar.currentFrame = next * 2; ticker.frame = next * 2; ticker.flush(); },
    destroy() { destroyed = true; request++; observer.disconnect(); avatar?.destroy(); room.destroy(); app.destroy(true); },
  };
}

import { AvatarLoader } from '@wiredsnippets/shroom/dist/objects/avatar/AvatarLoader';
import { ShroomAssetBundle } from '@wiredsnippets/shroom/dist/assets/ShroomAssetBundle';
import { AvatarEffectData } from '@wiredsnippets/shroom/dist/objects/avatar/data/AvatarEffectData';
import { AvatarManifestData } from '@wiredsnippets/shroom/dist/objects/avatar/data/AvatarManifestData';
import { AvatarAnimationData } from '@wiredsnippets/shroom/dist/objects/avatar/data/AvatarAnimationData';
import { FigureMapData } from '@wiredsnippets/shroom/dist/objects/avatar/data/FigureMapData';
import { FigureData } from '@wiredsnippets/shroom/dist/objects/avatar/data/FigureData';
import { AvatarPartSetsData } from '@wiredsnippets/shroom/dist/objects/avatar/data/AvatarPartSetsData';
import { AvatarActionsData } from '@wiredsnippets/shroom/dist/objects/avatar/data/AvatarActionsData';
import { AvatarGeometryData } from '@wiredsnippets/shroom/dist/objects/avatar/data/AvatarGeometryData';
import { toXml } from '../dance/codec';
import type { DanceDocument } from '../dance/document';

export function createDanceLoader(root: string, initial: DanceDocument) {
  let dance = initial;
  const definition = { id: 'editor', lib: 'editor', type: 'fx' };
  const actions = AvatarActionsData.default();
  const emptyManifest = new AvatarManifestData('<manifest><library><assets/><aliases/></library></manifest>');
  const effectBundle = {
    getData: async () => {
      const ids = [...new Set(dance.frames.flatMap(frame => frame.parts.map(part => part.id)))];
      const normalized = { ...dance, frames: dance.frames.map(frame => ({ ...frame, parts: ids.map(id => frame.parts.find(part => part.id === id) ?? { id, action: 'Default', frame: 0, dx: 0, dy: 0, dd: 0, extra: {} }) })) };
      return new AvatarEffectData(toXml(normalized));
    },
    getManifest: async () => emptyManifest,
    getTexture: async (): Promise<never> => { throw new Error('Danças não possuem texturas próprias.'); },
  };
  const loader = new AvatarLoader({
    createDependencies: async () => ({
      animationData: AvatarAnimationData.default(),
      figureMap: await FigureMapData.fromUrl(`${root}/figuremap.xml`),
      figureData: await FigureData.fromUrl(`${root}/figuredata.xml`),
      partSetsData: AvatarPartSetsData.default(),
      actionsData: actions,
      geometry: AvatarGeometryData.default(),
    }),
    getAssetBundle: library => ShroomAssetBundle.fromUrl(`${root}/figure/${library}.wsproom`),
    getEffectMap: async () => ({ getEffectInfo: () => definition, getEffects: () => [definition] }),
    getEffectBundle: async () => effectBundle,
  });
  return {
    loader,
    actions: actions.getActions().map(action => action.id),
    setDance(next: DanceDocument) {
      dance = next;
      // wsproom 1.1.0 has no public invalidation API. Keep this version-specific
      // bridge isolated: only compiled dance caches are cleared; textures remain.
      const caches = loader as unknown as { _effectCache: Map<string, unknown>; _lookOptionsCache: Map<string, unknown> };
      caches._effectCache.clear();
      caches._lookOptionsCache.clear();
    },
  };
}

export type Attributes = Record<string, string>;
export interface BodyPart {
  id: string; action: string; frame: number; dx: number; dy: number; dd: number;
  extra: Attributes;
}
export interface DanceFrame { parts: BodyPart[]; extra: Attributes }
export interface DanceDocument { name: string; description: string; extra: Attributes; frames: DanceFrame[] }
export const bodyParts = ['head', 'torso', 'leftarm', 'rightarm'] as const;
export function fixedParts(dance: DanceDocument): DanceDocument {
  return { ...dance, frames: dance.frames.map(frame => ({ ...frame, parts: bodyParts.map(id =>
    frame.parts.find(part => part.id === id) ?? { id, action: 'Default', frame: 0, dx: 0, dy: 0, dd: 0, extra: {} }
  ) })) };
}
export function newDance(): DanceDocument {
  return { name: 'dance.custom', description: 'Minha dança', extra: {}, frames: [{ extra: {}, parts: bodyParts.map(id => ({ id, action: 'Default', frame: 0, dx: 0, dy: 0, dd: 0, extra: {} })) }] };
}
export function duplicateFrame(dance: DanceDocument, index: number): DanceDocument {
  const copy = structuredClone(dance);
  copy.frames.splice(index + 1, 0, structuredClone(copy.frames[index]));
  return copy;
}
export function removeFrame(dance: DanceDocument, index: number): DanceDocument {
  const copy = structuredClone(dance);
  if (copy.frames.length > 1) copy.frames.splice(index, 1);
  return copy;
}
export function moveFrame(dance: DanceDocument, from: number, to: number): DanceDocument {
  const copy = structuredClone(dance);
  if (to >= 0 && to < copy.frames.length) copy.frames.splice(to, 0, ...copy.frames.splice(from, 1));
  return copy;
}

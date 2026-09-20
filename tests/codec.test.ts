import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseDance, toXml, toShroom } from '../src/dance/codec';
import { duplicateFrame, removeFrame, moveFrame } from '../src/dance/document';

describe('danças originais', () => {
  for (const [i, count] of [8, 8, 10, 16].entries()) {
    it(`preserva Dance${i + 1} em XML e SHROOM`, () => {
      const input = readFileSync(`Dance${i + 1}.shroom`);
      const dance = parseDance(input);
      expect(dance.frames).toHaveLength(count);
      expect(parseDance(toXml(dance))).toEqual(dance);
      expect(parseDance(toShroom(dance))).toEqual(dance);
      expect(() => parseDance(input.subarray(0, input.length - 5))).toThrow();
    });
  }
  it('rejeita XML inválido, sem frames e números inválidos', () => {
    for (const xml of ['<animation>', '<animation/>', '<animation><frame><bodypart id="head" dx="oops"/></frame></animation>']) {
      expect(() => parseDance(xml)).toThrow();
    }
  });
  it('preserva atributos adicionais e valores negativos', () => {
    const dance = parseDance('<animation name="custom" desc="A &amp; B" resetOnToggle="1"><frame repeats="2"><bodypart id="head" action="Default" frame="0" dx="-3" dy="-4" dd="-1" base="head"/></frame></animation>');
    expect(parseDance(toXml(dance))).toEqual(dance);
    expect(dance.frames[0].parts[0].dx).toBe(-3);
  });
  it('duplica sem compartilhar objetos, reordena e mantém ao menos um frame', () => {
    const dance = parseDance(readFileSync('Dance1.shroom'));
    const next = duplicateFrame(dance, 0);
    next.frames[1].parts[0].dx = 42;
    expect(next.frames[0].parts[0].dx).toBe(0);
    expect(moveFrame(next, 1, 0).frames[0].parts[0].dx).toBe(42);
    const single = { ...dance, frames: [dance.frames[0]] };
    expect(removeFrame(single, 0).frames).toHaveLength(1);
  });
});

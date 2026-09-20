import { expect, it } from 'vitest';
import { Playback } from '../src/preview/ticker';
it('pausa, seleciona e repete usando tempo decorrido', () => {
  const clock = new Playback();
  clock.length = 8;
  clock.advance(1000);
  expect(clock.frame).toBe(0);
  clock.seek(5);
  expect(clock.frame).toBe(5);
  clock.playing = true;
  clock.advance(250);
  expect(clock.frame).toBe(3);
  clock.playing = false;
  clock.advance(1000);
  expect(clock.frame).toBe(3);
  clock.seek(100);
  expect(clock.frame).toBe(7);
});

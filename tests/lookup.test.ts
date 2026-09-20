import { expect, it, vi } from 'vitest';
import { lookupFigure } from '../src/avatar/lookup';
it('busca figureString com nome codificado no hotel selecionado', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ figureString: 'hd-180-1' })));
  expect(await lookupFigure('com.br', 'A & B', undefined, fetcher)).toBe('hd-180-1');
  expect(String(fetcher.mock.calls[0][0])).toBe('https://www.habbo.com.br/api/public/users?name=A+%26+B');
});
it('rejeita hotel desconhecido, nome vazio, erro HTTP e payload incompleto', async () => {
  await expect(lookupFigure('evil.test', 'abc')).rejects.toThrow();
  await expect(lookupFigure('com.br', ' ')).rejects.toThrow();
  await expect(lookupFigure('com.br', 'a', undefined, vi.fn().mockResolvedValue(new Response('', { status: 404 })))).rejects.toThrow();
  await expect(lookupFigure('com.br', 'a', undefined, vi.fn().mockResolvedValue(new Response('{}')))).rejects.toThrow();
});

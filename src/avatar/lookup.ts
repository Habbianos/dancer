export const hotels = { 'com.br': 'BR', com: 'COM', es: 'ES', fr: 'FR', de: 'DE', it: 'IT', nl: 'NL', fi: 'FI', 'com.tr': 'TR' } as const;
export async function lookupFigure(hotel: string, nick: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<string> {
  if (!Object.hasOwn(hotels, hotel)) throw new Error('Hotel inválido.');
  if (!nick.trim()) throw new Error('Informe o nome do usuário.');
  const query = new URLSearchParams({ name: nick.trim() });
  const timeout = AbortSignal.timeout(12000);
  const response = await fetcher(`https://www.habbo.${hotel}/api/public/users?${query}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok) throw new Error(response.status === 404 ? 'Usuário não encontrado.' : 'Não foi possível consultar o hotel.');
  const data = await response.json();
  if (typeof data.figureString !== 'string' || !data.figureString.trim()) throw new Error('Este usuário não possui uma aparência disponível.');
  return data.figureString;
}

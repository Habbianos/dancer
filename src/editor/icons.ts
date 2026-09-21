const paths = {
  play: 'M8 5l11 7-11 7Z',
  pause: 'M8 5v14M16 5v14',
  close: 'm6 6 12 12M6 18 18 6',
} as const;

export function icon(name: keyof typeof paths): string {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"/></svg>`;
}

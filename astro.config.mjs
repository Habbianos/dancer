import { defineConfig } from 'astro/config';
import { execFileSync } from 'node:child_process';
import { mkdir, copyFile } from 'node:fs/promises';

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://habbianos.github.io',
  base: process.env.BASE_PATH || '/',
  integrations: [{
    name: 'required-shroom-assets',
    hooks: {
      'astro:config:setup': async () => {
        await mkdir('public/dances', { recursive: true });
        for (let i = 1; i <= 4; i++) await copyFile(`Dance${i}.shroom`, `public/dances/Dance${i}.shroom`);
      },
      'astro:build:start': () => execFileSync(process.execPath, ['--import', 'tsx', 'scripts/check-assets.ts'], { stdio: 'inherit' }),
    },
  }],
  vite: {
    define: { 'process.env': {} },
    server: { watch: { ignored: ['**/.cache/**', '**/public/assets/shroom/**'] } },
  },
});

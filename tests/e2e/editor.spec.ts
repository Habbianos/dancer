import { expect, test } from '@playwright/test';

test('aplica documento substituído durante a inicialização da prévia', async ({ page }) => {
  await page.route(/\/(?:src\/preview\/renderer\.ts|_astro\/renderer\.[^/]+\.js)/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `export async function createPreview(host, dance) {
      host.dataset.previewDance = dance.name;
      host.dataset.initializing = 'true';
      await new Promise(resolve => window.addEventListener('finish-test-init', resolve, { once: true }));
      return { actions: ['Default'], setDance: async dance => { host.dataset.previewDance = dance.name; }, setFigure: async () => {}, setDirection: async () => {}, seek() {}, destroy() {} };
    }`,
  }));
  await page.goto('./');
  await expect(page.locator('#stage')).toHaveAttribute('data-initializing', 'true');
  await page.getByRole('button', { name: 'Nova', exact: true }).click();
  await page.waitForTimeout(100);
  await page.evaluate(() => window.dispatchEvent(new Event('finish-test-init')));
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#stage')).toHaveAttribute('data-preview-dance', 'dance.custom');
});

test('edita, reproduz, rotaciona e exporta a dança real', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden({ timeout: 30000 });
  await expect(page.locator('#status')).toBeEmpty();
  await expect(page.locator('#frames button')).toHaveCount(8);
  const before = await page.locator('#stage canvas').screenshot();
  await page.getByRole('button', { name: 'Reproduzir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.locator('#timeline').fill('2');
  await expect(page.locator('#timecode')).toHaveText('03 / 08');
  await page.getByLabel('Cabeça dx', { exact: true }).fill('18');
  await page.waitForTimeout(350);
  const edited = await page.locator('#stage canvas').screenshot();
  expect(edited.equals(before)).toBe(false);
  await page.getByRole('button', { name: 'Duplicar', exact: true }).click();
  await expect(page.locator('#frames button')).toHaveCount(9);
  await page.getByRole('button', { name: 'Girar para direita' }).click();
  await expect(page.locator('#direction')).toHaveText('3 / 7');
  await page.locator('#format').selectOption('xml');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar/ }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.xml$/);
  await page.locator('#file').setInputFiles(await download.path());
  await expect(page.locator('#frames button')).toHaveCount(9);
  await page.reload();
  await expect(page.locator('#frames button')).toHaveCount(9);
  expect(errors).toEqual([]);
});

test('preserva documento inválido e busca figureString pela API do hotel', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden({ timeout: 30000 });
  await page.locator('#file').setInputFiles({ name: 'broken.xml', mimeType: 'application/xml', buffer: Buffer.from('<animation>') });
  await expect(page.locator('#status')).toContainText('inválido');
  await expect(page.locator('#frames button')).toHaveCount(8);
  await page.route('https://www.habbo.com.br/api/public/users?name=Teste', route => route.fulfill({ json: { figureString: 'hd-180-1.ch-210-66.lg-270-82.sh-290-80' }, headers: { 'access-control-allow-origin': '*' } }));
  await page.locator('#appearance-mode').selectOption('user');
  await page.getByLabel('Figurestring ou nome do usuário').fill('Teste');
  await page.getByRole('button', { name: 'Aplicar aparência' }).click();
  await expect(page.locator('#status')).toBeEmpty();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('renderiza os quatro presets, oito direções e mantém a pausa', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden({ timeout: 30000 });
  for (const [index, count] of [8, 8, 10, 16].entries()) {
    await page.locator('#preset').selectOption(String(index + 1));
    await expect(page.locator('#frames button')).toHaveCount(count);
    await page.locator('#timeline').fill(String(count - 1));
    await expect(page.locator('#timecode')).toHaveText(`${String(count).padStart(2, '0')} / ${String(count).padStart(2, '0')}`);
    await page.waitForTimeout(150);
    await expect(page.locator('#status')).toBeEmpty();
  }
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'Girar para direita' }).click();
    await page.waitForTimeout(100);
  }
  await expect(page.locator('#direction')).toHaveText('2 / 7');
  await page.waitForTimeout(300);
  const paused = await page.locator('#stage canvas').screenshot();
  await page.waitForTimeout(250);
  expect((await page.locator('#stage canvas').screenshot()).equals(paused)).toBe(true);
  await expect(page.locator('#timecode')).toHaveText('16 / 16');
  expect(errors).toEqual([]);
});

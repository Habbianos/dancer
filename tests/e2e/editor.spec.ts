import { expect, test } from '@playwright/test';

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

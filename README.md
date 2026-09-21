# Dancer

Editor de danças Habbo em AstroJS, TypeScript e [WiredSnippets/wsproom](https://github.com/WiredSnippets/wsproom). Site estático: a edição, reprodução e busca de usuários acontecem no navegador.

## Executar

Requer Node.js 22 e Git. No PowerShell com scripts desabilitados, use `npm.cmd` em lugar de `npm`.

```sh
npm ci
npm run assets:prepare
npm run dev
```

A primeira preparação baixa e converte as bibliotecas de avatar com as ferramentas do wsproom. Pode demorar vários minutos. Não baixa furnis. Aguarde a preparação terminar antes de iniciar o servidor de desenvolvimento.

Os downloads ficam em `.cache/shroom/`; os arquivos publicados em `public/assets/shroom/`. Ambos são ignorados pelo Git. As quatro danças da raiz são exemplos fornecidos com o projeto e permanecem versionadas.

```sh
npm run assets:check
npm test
npm run typecheck
npm run build
npm run preview
```

Com o servidor iniciado, execute `npm run test:e2e` para os testes de navegador. No Windows eles usam o Edge instalado; em Linux execute antes `npx playwright install --with-deps chromium`. `TEST_URL` define outra URL, incluindo o subdiretório de publicação.

O hook de build do Astro valida hashes, XML, bibliotecas e imagens. Assets ausentes, incompletos ou alterados impedem o build, inclusive ao executar `astro build` diretamente. Os assets são incluídos no artefato estático `dist/`, sem serem commitados.

Para atualizar o catálogo: `npm run assets:prepare -- --refresh`. A variável `HABBO_EXTERNAL_VARIABLES` permite escolher outra configuração pública de assets. A preparação reutiliza SWFs já baixados da mesma versão do catálogo.

## Usar

- Abra uma das quatro danças ou importe XML, `.shroom` ou `.wsproom`.
- Selecione um frame e altere ação, frame do sprite, `dx`, `dy` e `dd` de cada parte.
- Adicione, duplique, remova ou reordene frames. A prévia reflete as edições.
- Use play/pause, o seletor de frame e as setas de rotação. Espaço também alterna a reprodução quando o foco está fora dos campos.
- Cole uma figurestring ou selecione Usuário, informe o nick e escolha o hotel.
- Exporte em XML ou SHROOM. O rascunho também é salvo neste navegador quando o armazenamento local está disponível.

A busca usa diretamente `https://www.habbo.[hotel]/api/public/users?name=<nick>` e lê `figureString`. Depende da disponibilidade e política CORS do hotel. A edição com figurestring continua disponível quando a consulta falha.

## GitHub Pages

1. Envie o projeto para seu repositório GitHub, branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**.
3. Execute o workflow **GitHub Pages** ou envie um commit para `main`.

O workflow instala dependências pelo lockfile, prepara os assets, executa testes, a checagem obrigatória do build e testes de navegador no resultado estático, e publica o artefato. `site` e `base` são calculados pelo nome do repositório. Não é preciso commitar assets nem criar branch `gh-pages`.

Localmente, `SITE_URL` e `BASE_PATH` permitem reproduzir a URL de publicação. Exemplo PowerShell:

```powershell
$env:SITE_URL = 'https://seu-usuario.github.io'
$env:BASE_PATH = '/dancer/'
npm run build
npm run preview
```

## Motor e assets

O motor é `@wiredsnippets/shroom@1.1.0`, com ferramentas de conversão da revisão `eaf266f54d5c8a9eb06174f13a85174e2745e034` de WiredSnippets/wsproom. O adaptador de edição limpa apenas os caches de definição de animação, preservando bibliotecas e texturas; essa integração deve ser revisada ao atualizar o motor.

Alguns SWFs oficiais contêm entradas de manifest sem símbolo correspondente. A preparação remove apenas referências comprovadamente ausentes no SWF original, mantendo a checagem de falhas de extração.

Shroom é distribuído sob **LGPL-3.0-or-later**; consulte [COPYING.LESSER](https://github.com/WiredSnippets/wsproom/blob/master/COPYING.LESSER). Os assets Habbo pertencem aos respectivos titulares e não integram o código-fonte deste repositório.

# Editor de danças Habbo

## Objetivo

Aplicação web independente com AstroJS, build estático e publicação no GitHub Pages, também executável localmente. Criar e customizar danças com o renderizador WiredSnippets/wsproom. Interface em português, predominantemente branca, sem títulos decorativos ou textos desnecessários.

## Interface

- Barra compacta: seleção das quatro danças de exemplo, nova dança, importar e exportar.
- Duas colunas: editor à esquerda e prévia em tempo real à direita.
- Editor: seleção de frame; adicionar, duplicar, excluir e reordenar frames; tabela de partes do corpo com action, frame, dx, dy e dd. Campos numéricos inteiros com rótulos acessíveis. Não permitir excluir o último frame.
- Prévia: quarto isométrico 3×3 sem paredes, avatar na posição central (1, 1), rotação nas oito direções. Play/pause, input range para selecionar o frame e indicação compacta do frame ativo. Selecionar um frame pausa a reprodução para inspeção precisa.
- Aparência: figurestring ou busca por nome e seletor de hotel. Erros concisos junto aos controles, mantendo o último avatar válido.
- Em telas estreitas, empilhar as colunas sem impedir edição ou reprodução.

## Arquitetura proposta

AstroJS com `output: 'static'`, TypeScript no navegador e adaptador isolado para wsproom e PixiJS. Nenhum servidor de aplicação em produção. Node é usado apenas nas ferramentas de desenvolvimento, preparação de assets e build. Dependência do wsproom fixada em versão ou revisão verificável, com créditos e licença preservados. Carregar o motor apenas no navegador para evitar acesso a DOM ou WebGL durante o build.

Um único estado de animação controla a tabela, a timeline e o renderizador. Um relógio controlável deve fornecer o frame exato ao motor, inclusive quando pausado. Editar propriedades atualiza a prévia sem reiniciar o aplicativo. Descartar carregamentos obsoletos ao trocar rapidamente a aparência.

Módulos separados para documento da dança, codec XML/SHROOM, reprodução, integração do motor, interface e busca de usuários. Todas as URLs locais respeitam `import.meta.env.BASE_URL`, incluindo presets e assets.

## Formatos e persistência

Os quatro arquivos fornecidos são containers binários SHROOM contendo animation.bin e manifest.bin, e não arquivos XML puros. As danças têm respectivamente 8, 8, 10 e 16 frames.

Implementar leitura e escrita do container com validação de limites. Importar e exportar XML e SHROOM, preservando metadados e atributos suportados. Validar XML antes de substituir o documento ativo. Incluir as quatro danças como presets sem modificar os originais. Salvar o trabalho automaticamente no armazenamento local e permitir exportação explícita.

## Assets e hotéis

Reutilizar as ferramentas de download e conversão do wsproom para preparar apenas dados e bibliotecas necessários aos avatares e ao piso. Não baixar furnis. Oferecer um comando documentado de preparação de assets, com cache local. O primeiro download e a busca de usuários exigem internet; a edição de avatares já disponíveis usa os assets locais.

Inspeção do código upstream confirmou que o comando genérico `dump` chama `downloadAllFiles`, que baixa furnidata e móveis incondicionalmente. Portanto, o projeto deverá compor as funções de download de figuras e conversão de SWFs individualmente, sem executar esse fluxo genérico. O motor expõe o contrato `IAnimationTicker` com `subscribe` e `current`; o adaptador de reprodução deverá implementar esse contrato e validar a injeção no contexto de renderização.

Assets baixados ou convertidos ficam em `public/assets/shroom/`, com arquivos temporários em `.cache/shroom/`; ambos são ignorados pelo Git. As quatro danças fornecidas pelo usuário são fontes versionadas, não downloads. O comando de preparação baixa e converte os assets. A checagem pré-build é obrigatória e falha se faltarem metadados, bibliotecas ou arquivos referenciados, ou se houver arquivos vazios/inválidos. Integrar a checagem ao ciclo do Astro para cobrir também invocações diretas de `astro build`. O build não pode produzir uma prévia inutilizável quando os assets faltarem.

Buscar usuários diretamente do navegador em `https://www.habbo.[hotel]/api/public/users?name=<nick>`, usando `URLSearchParams` e extraindo `figureString` da resposta. Hotéis em lista fixa: com.br, com, es, fr, de, it, nl, fi e com.tr. Tratar nome vazio, timeout, HTTP não exitoso, resposta sem figureString, falhas de rede/CORS e respostas obsoletas. Preservar o avatar anterior em caso de erro. Não usar proxy ou backend, pois a publicação é estática. Verificar a requisição real no navegador, já que uma resposta HTTP fora do navegador não comprova permissão CORS.

## GitHub Pages e Git

Configurar `site` e `base` para páginas de projeto e permitir personalização por ambiente. Workflow com checkout, instalação reproduzível, cache de assets associado à revisão do motor/configuração, download/conversão, testes, checagem obrigatória, build, upload do artefato e deploy no environment github-pages. Os assets fazem parte do artefato publicado, nunca dos commits. Não usar branch de distribuição para versionar os arquivos gerados.

Realizar commits progressivos por etapa funcional. Preparar workflow e instruções de ativação do Pages; a execução do deploy depende de um remoto GitHub acessível e configurado, que ainda não existe neste repositório local.

## Alternativas consideradas

1. Astro estático (escolhido pelo usuário): publicação em GitHub Pages, assets preparados no build e busca direta na API pública.
2. Servidor Node: descartado por incompatibilidade com a hospedagem estática solicitada.
3. Desktop: descartado pela preferência web confirmada.

## Verificação e entrega

Testes de importação e exportação com os quatro arquivos reais; rejeição de containers truncados e XML inválido; edição e ordem dos frames; relógio de reprodução, pausa e seleção manual. Verificar build e interface em navegador, incluindo movimentos editados, troca de avatar, rotação, quarto sem paredes e erros de rede.

Entregar repositório Git local, commits progressivos, código, lockfile, workflow GitHub Pages e instruções de instalação, preparação de assets, execução e publicação. Verificar build em subdiretório, falha obrigatória sem assets e ausência de downloads no índice Git. Registrar limitações verificadas, sem substituir a animação real por imagens simuladas.

## Estado

Implementada em AstroJS com editor e renderização no navegador, assets obrigatórios não versionados e workflow GitHub Pages. Revisão independente e testes de regressão concluídos. Publicação remota depende da indicação do repositório GitHub; nenhum remoto está configurado nesta entrega local.

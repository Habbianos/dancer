# Editor de danças Habbo

## Objetivo

Aplicação web independente executada localmente, conforme preferência confirmada pelo usuário. Criar e customizar danças com o renderizador WiredSnippets/wsproom. Interface em português, predominantemente branca, sem títulos decorativos ou textos desnecessários.

## Interface

- Barra compacta: seleção das quatro danças de exemplo, nova dança, importar e exportar.
- Duas colunas: editor à esquerda e prévia em tempo real à direita.
- Editor: seleção de frame; adicionar, duplicar, excluir e reordenar frames; tabela de partes do corpo com action, frame, dx, dy e dd. Campos numéricos inteiros com rótulos acessíveis. Não permitir excluir o último frame.
- Prévia: quarto isométrico 3×3 sem paredes, avatar na posição central (1, 1), rotação nas oito direções. Play/pause, input range para selecionar o frame e indicação compacta do frame ativo. Selecionar um frame pausa a reprodução para inspeção precisa.
- Aparência: figurestring ou busca por nome e seletor de hotel. Erros concisos junto aos controles, mantendo o último avatar válido.
- Em telas estreitas, empilhar as colunas sem impedir edição ou reprodução.

## Arquitetura proposta

TypeScript e Vite no frontend; servidor Node local para servir o build, buscar usuários nos hotéis permitidos e disponibilizar assets locais. Adaptador isolado para wsproom e PixiJS. Dependência do wsproom fixada em versão ou revisão verificável, com créditos e licença preservados.

Um único estado de animação controla a tabela, a timeline e o renderizador. Um relógio controlável deve fornecer o frame exato ao motor, inclusive quando pausado. Editar propriedades atualiza a prévia sem reiniciar o aplicativo. Descartar carregamentos obsoletos ao trocar rapidamente a aparência.

Módulos separados para documento da dança, codec XML/SHROOM, reprodução, integração do motor, interface e servidor local.

## Formatos e persistência

Os quatro arquivos fornecidos são containers binários SHROOM contendo animation.bin e manifest.bin, e não arquivos XML puros. As danças têm respectivamente 8, 8, 10 e 16 frames.

Implementar leitura e escrita do container com validação de limites. Importar e exportar XML e SHROOM, preservando metadados e atributos suportados. Validar XML antes de substituir o documento ativo. Incluir as quatro danças como presets sem modificar os originais. Salvar o trabalho automaticamente no armazenamento local e permitir exportação explícita.

## Assets e hotéis

Reutilizar as ferramentas de download e conversão do wsproom para preparar apenas dados e bibliotecas necessários aos avatares e ao piso. Não baixar furnis. Oferecer um comando documentado de preparação de assets, com cache local. O primeiro download e a busca de usuários exigem internet; a edição de avatares já disponíveis usa os assets locais.

Busca de usuários no servidor com lista fixa de domínios dos hotéis, nome codificado, timeout e tratamento de usuário inexistente. Não aceitar URLs arbitrárias como hotel.

## Alternativas consideradas

1. Web local com servidor Node (recomendada): instalação simples, acesso aos arquivos de assets e busca de usuários centralizada.
2. Site totalmente estático: distribuição menor, mas dependente das permissões CORS dos serviços de usuários e assets.
3. Desktop: empacotamento e atualização adicionais; o usuário confirmou preferência pela opção web local.

## Verificação e entrega

Testes de importação e exportação com os quatro arquivos reais; rejeição de containers truncados e XML inválido; edição e ordem dos frames; relógio de reprodução, pausa e seleção manual. Verificar build e interface em navegador, incluindo movimentos editados, troca de avatar, rotação, quarto sem paredes e erros de rede.

Entregar repositório Git local, código, lockfile, instruções de instalação, preparação de assets e execução. A publicação em um remoto não faz parte desta entrega. Registrar limitações verificadas, sem substituir a animação real por imagens simuladas.

## Estado

Proposta escrita para revisão do usuário antes do plano de implementação, conforme a skill brainstorming ativa. Código do produto ainda não implementado.

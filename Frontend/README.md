# RedeCamarão — Frontend

Interface em React, TypeScript e Vite. O marketplace está disponível em `/` e `/marketplace`; os produtos, em `/produtos`; cada oferta, em `/produtos/:id`; os produtores, em `/produtores`; cada perfil, em `/produtores/:id`; o cadastro, em `/registro`; o login, em `/entrar` e `/login`.

## Marketplace

- Tela responsiva com apresentação, categorias e ofertas ativas carregadas do banco de dados.
- Busca por produto, descrição, tamanho e localização; filtros por tipo, tamanho, peso e região usam os dados retornados pela API.
- Os atalhos de categoria combinam com a busca e com o filtro permanente “Por região”, que oferece os 27 estados/DF. Trocar de categoria preserva a região e a busca; “Limpar filtros” restaura o catálogo. A seleção regional não solicita geolocalização.
- Os detalhes da oferta incluem descrição, localização, quantidade, preço e período de disponibilidade.
- Quando a API retorna uma lista vazia, a tela informa que nenhuma oferta foi encontrada. Falhas de conexão ou respostas inválidas são exibidas separadamente e permitem tentar novamente.
- O marketplace consome `GET /offer/marketplace`, uma rota pública que retorna somente ofertas ativas dentro do período de disponibilidade, sem expor o ID do anunciante.
- Fotografias ilustrativas locais em `public/images`; fontes em `public/images/SOURCES.md`.

## Produtos

- `/produtos` e `/produtos/` exibem o catálogo, com o link Produtos ativo no header. “Ver todas” no marketplace também leva ao catálogo, sem recarregar o header.
- Busca por oferta, descrição, tamanho e região; filtros combinados por cidade/estado, faixa de preço por kg, tamanho e quantidade disponível. As opções de um mesmo grupo se somam; grupos diferentes se combinam. Os filtros são aplicados pelo botão e podem ser removidos pelos chips ou por “Limpar tudo”.
- Preços aceitam vírgula decimal e separador de milhares; valores inválidos ou intervalos invertidos recebem orientação antes de aplicar.
- Ordenação por mais recentes (ordem retornada pela API), menor/maior preço e maior quantidade; paginação real de seis ofertas por página.
- O catálogo consome a API pública de listagem de ofertas. Fotos locais identificadas como ilustrativas compõem os cards, pois a listagem não fornece fotos nem nomes dos anunciantes. Não são criados anúncios ou nomes de produtores fictícios.
- Filtros laterais no desktop; painel expansível até 1000px. Cards em 3/2/1 colunas, campos de 16px e controles adaptados para toque. Header e footer mantêm os padrões compartilhados.
- Carregamento, falha com nova tentativa, catálogo vazio e busca sem resultados têm estados próprios. “Ver oferta” abre a página específica, tanto no catálogo quanto no marketplace e nos relacionados.

## Detalhe da oferta

- `/produtos/:id` abre diretamente uma oferta, inclusive após atualizar a página. Produtos permanece ativo no header; a navegação preserva header, footer e sessão.
- `GET /offer/marketplace/:id` retorna somente ofertas ativas dentro do período, com dados do lote, publicação, fotos e os campos de produtor já públicos. Ofertas inexistentes ou indisponíveis retornam 404; a tela diferencia isso de uma falha de conexão e permite nova tentativa.
- A galeria usa as fotos cadastradas, com miniaturas, ampliação, navegação por setas e fechamento por Escape. Quando não há fotos, as imagens locais são explicitamente identificadas como ilustrativas. Fotos que não carregam têm estado próprio.
- Descrição, quantidade mínima/máxima, disponibilidade e apresentação do produtor usam os dados da API. Não são inventados tempo de resposta, condição do produto ou data de entrada do produtor.
- Outras ofertas disponíveis são ordenadas por proximidade de localização/estado e tipo, excluindo a oferta atual e duplicatas.
- Compartilhar usa o recurso nativo quando disponível, com alternativa de copiar o link ou selecioná-lo manualmente. Salvar mantém apenas IDs em `localStorage`, sob a chave `rede-camarao:saved-offers`, neste navegador. Dados de sessão não são armazenados por esse recurso.
- O contato por WhatsApp está indicado como recurso futuro. Esta etapa não implementa integração com WhatsApp, chat interno ou tabela de mensagens.
- Backend: `npm.cmd run build` e `npm.cmd run test:offer-detail` verificam o contrato HTTP com DAOs simulados, sem acessar o banco.

## Produtores

- `/produtores` e `/produtores/` exibem o diretório, com título, busca por nome, estado e cidade, ordenação e seis cards por página. O link Produtores fica ativo no header, inclusive ao abrir um perfil.
- A busca ignora acentos e combina nome/localização. As cidades disponíveis dependem do estado selecionado; trocar o estado limpa a cidade anterior. Os filtros só são aplicados por “Buscar produtores” e podem ser limpos na área de resultados.
- “Mais relevantes” prioriza correspondências do nome e depois quantidade de ofertas ativas; também há ordem alfabética crescente/decrescente e mais ofertas. As contagens vêm da API, incluindo produtores sem ofertas.
- `GET /users/producers` retorna `id`, `name`, `description`, `location`, `phone`, `businessHours`, `profilePicture` e `activeOfferCount`, sem e-mail ou documento. A consulta agrega a contagem de ofertas ativas dentro do prazo em uma única consulta, preservando produtores com zero ofertas.
- “Ver produtor” abre `/produtores/:id`: capa ilustrativa, identidade, apresentação, contato público, localização informada e ofertas reais. Os cards reutilizam `ProductCard` com o nome do produtor; filtros por tipo e paginação de quatro itens acompanham a grade de duas colunas, que passa para uma no celular. O mapa abre uma busca externa pela região cadastrada, sem coordenadas ou endereço inventados.
- `GET /users/producers/:id` retorna `{ producer, offers }`; um produtor sem ofertas tem perfil válido, e produtor inexistente retorna 404. Não há ações de gestão de ofertas nessa página pública.
- A paginação foi extraída para `Pagination`, compartilhada por produtos, produtores e ofertas do perfil. Header, footer, ícones e navegação sem recarregamento permanecem compartilhados. Não há faixa de caminhos/voltar adicional.
- Cards em 3/2/1 colunas, busca adaptada a desktop/tablet/celular, campos de 16px e controles de pelo menos 44px. Carregamento, falha com nova tentativa, diretório vazio, busca sem resultados e perfil indisponível têm estados próprios.
- Imagens ilustrativas originais geradas com Imagegen integrado ficam em `public/images/producer-farm-1.jpg`, `producer-farm-2.jpg` e `producer-farm-3.jpg`. Não representam as fazendas cadastradas. Prompts finais e proveniência: [PRODUCER_ASSETS.md](public/images/PRODUCER_ASSETS.md).
- O contato pelo WhatsApp continua como recurso futuro. Nenhum chat interno ou integração de mensagens foi adicionado.
- Backend: `npm.cmd run test:producers` valida rotas, campos públicos, contagem, casos vazios e consulta agregada com dados simulados, sem acessar o banco.

## Painel do produtor

- `/painel` mostra indicadores, até três ofertas recentes e os dados do perfil. Os botões levam ao cadastro com fotos ou à página de gerenciamento. Compradores continuam com ofertas salvas e dados pessoais.
- `/painel/ofertas` é a página **Minhas ofertas**, com abas Todas, Ativas, Pausadas, Rascunhos e Encerradas quando houver, contagens reais, busca sem acentos por nome/código, ordenação e paginação de seis itens. No celular, as linhas viram cartões.
- A lista usa a capa cadastrada, com fallback identificado como ilustrativo, e a data real de atualização. `GET /offer/user/:userId` retorna `updatedAt` e `coverPhoto` e exige o ID do dono do token. Rascunhos são omitidos da busca geral e suas fotos são restritas ao dono.
- Pausar, ativar e remover usam confirmação em diálogo nativo. A seleção da página permite pausar ofertas ativas em lote. Duplicar abre o cadastro com campos copiados e novas datas; as fotos do novo lote devem ser adicionadas.
- `npm.cmd run test:producer-dashboard`, no backend, verifica esses campos sem banco. O frontend valida o contrato e testa busca, status e limites do período em `npm.cmd test`.

## Cadastro e edição de ofertas

- “Editar” no painel abre `/painel/ofertas/:id/editar`, mantendo header, footer e a navegação sem recarregamento. A página exige conta de produtor e carrega apenas ofertas da própria conta; “Minhas ofertas” fica ativo no header.
- “Cadastrar nova oferta” abre `/painel/ofertas/nova`, usando o mesmo formulário, galeria e prévia da edição. Cidade e estado começam com a localização do produtor; após o sucesso, a edição da nova oferta é aberta sem recarregar o documento.
- Formulário com fotos, título, descrição, tipo, tamanho, preço em formato brasileiro, quantidades mínima/máxima, cidade, estado e disponibilidade. A validação mantém os campos preenchidos e destaca o primeiro erro. A prévia reflete os dados locais e a capa escolhida, sem gravar.
- Até cinco fotos JPG/PNG de até 3 MB cada, com seleção de capa e remoção antes de salvar. O indicador de preenchimento verifica cinco critérios objetivos; não avalia nitidez ou qualidade visual das fotos.
- “Salvar rascunho” usa `DRAFT`, separado de `INACTIVE` (pausada). Os campos obrigatórios do lote são validados antes de salvar. Publicar usa `ACTIVE`; desmarcar a disponibilidade salva como pausada. O período controla a exibição no marketplace.
- `POST /offer/editor` cadastra e `PUT /offer/:id/editor` atualiza os campos e a galeria em uma transação. Imagens novas ficam em `Backend/uploads/offers`. Falhas preservam as alterações e não deixam ofertas parcialmente criadas; a renovação do token não recarrega o formulário.
- O SQL inclui `RASCUNHO`. Bancos com histórico usam `20261114120000-add-draft-offer-status.js`; instalações manuais acrescentam esse valor ao enum conforme `Backend/database/README.md`, sem recriar o banco.
- O menu do ícone do produtor inclui “Sair da conta” tanto no painel quanto na edição. O logout usa o endpoint existente, só limpa a sessão após sucesso e leva a `/entrar` sem recarregar o documento; falhas permitem nova tentativa no menu.

## Foto de perfil

- Em `/painel`, na seção Dados do perfil (ou Dados pessoais para compradores), “Adicionar foto”/“Trocar foto” abre a seleção de JPG ou PNG de até 3 MB. A prévia é local até clicar em “Salvar foto”; cancelar descarta a alteração. A remoção também precisa ser salva.
- A imagem salva aparece no menu da conta. Para produtores, também aparece na identidade do perfil público, no card da fazenda e na identificação do produtor na oferta. O componente compartilhado `Avatar` mantém um ícone do Font Awesome quando não há foto ou a imagem falha.
- `PUT /users/me/photo` recebe `{ data: "data:image/png;base64,..." }` (ou JPEG), e `{ data: null }` remove a imagem. O dono vem exclusivamente do token. A API valida formato, assinatura e tamanho; grava o arquivo em `Backend/uploads/profiles` e a URL em `users.profilePicture`. A gravação usa transação, elimina novos arquivos em falhas e remove a foto anterior após a confirmação no banco.
- `GET /users/me` e os endpoints públicos de produtores/ofertas retornam `profilePicture`, com `null` para quem ainda não enviou foto. O diretório de uploads precisa ser persistente no ambiente que executa a API. `PUBLIC_API_URL`, quando configurada, define a origem das imagens.
- A alteração de banco está em `20261114130000-add-user-profile-picture.js`; instruções para instalações manuais estão em `Backend/database/README.md`. Validação: frontend `npm.cmd test`; backend `npm.cmd run test:profile-photo`, `test:producers` e `test:offer-detail`.

## Padrão visual e responsividade

- Ícones do Font Awesome Free, com o componente React oficial e importação individual dos símbolos usados. O componente compartilhado Icon preserva os tamanhos, cores e rótulos acessíveis das ações. Camarão identifica produtos; fazenda identifica produtores; água representa aquicultura; fotos, cópia e logout têm símbolos específicos. Os pacotes e estilos ficam no bundle local, sem CDN ou Kit. Referência: [integração oficial com React](https://docs.fontawesome.com/web/use-with/react/add-icons).

A Feira do Agricultor foi usada como referência de organização: estilos próximos dos componentes, cores compartilhadas, conteúdo com largura máxima e grids que se adaptam à tela. A identidade azul da RedeCamarão permanece como base para as próximas telas.

- O container compartilhado ocupa 89% da tela, com largura máxima de 1800px, mantendo logo e ações próximos às laterais como no wireframe. As cores e o contraste dos textos secundários ficam em `src/index.css`.
- O header concentra seus estilos em `components/Header.css`: área interna de 80px no desktop e 64px até 1000px, logo de 24px e botões de pelo menos 44px. As páginas não devem sobrescrever essas medidas. O menu móvel abre sobre o conteúdo e fecha por Escape, clique fora ou navegação.
- O marketplace usa títulos fluidos, categorias em 5/3/2/1 colunas e ofertas em 4/2/1 colunas. Em telas de até 600px, o botão de busca fica abaixo do campo; o texto do campo mantém 16px para leitura em celulares.
- A busca e os atalhos respeitam a preferência de movimento reduzido. Os estados de carregamento e erro não apresentam contagens de ofertas como se os dados já estivessem disponíveis.
- O cadastro tem largura máxima própria de 1200px, com título de até 44px e formulário proporcional, sem alterar a largura do header. Até 1000px, o conteúdo passa para uma coluna.
- A navegação interna usa a History API e mantém o header e a sessão montados, evitando o recarregamento completo que causava a piscada entre páginas. Voltar/avançar, âncoras e posições de rolagem são tratados pelo hook `useNavigation`; links externos, downloads e abertura em nova aba mantêm o comportamento do navegador.
- A navegação entre as telas fica no header, sem faixa adicional de voltar/avançar ou caminho separado por barras.
- Campos de texto, seletores e buscas compartilham foco sutil com borda reforçada internamente, sem mudar as dimensões do controle. Links e botões mantêm o indicador de teclado.

## Executar

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Configure `VITE_API_URL` no `.env` com a URL do backend, sem barra final ou caminho de endpoint. Reinicie o Vite depois de alterar a variável. O exemplo usa `http://localhost:3001`; o backend usa essa porta por padrão e o Vite usa 5173. O `FRONTEND_URL` do backend deve permitir a origem do frontend.

## Cadastro

- Etapa 1: comprador/produtor, nome, CPF/CNPJ, e-mail, senha, confirmação e aceite.
- Etapa 2: telefone opcional e localidade preenchida com cidade e estado; os dois campos de localidade podem ficar vazios, mas devem ser informados juntos.
- Validações ao sair do campo e ao continuar; campos já visitados atualizam o feedback durante a edição.
- Envio para `POST /users/register`, com `BUYER`/`PRODUCER`, documento/telefones normalizados e localidade no formato `Cidade, UF`. Confirmação de senha e aceite não são enviados ao DTO.
- Sucesso exibido somente após resposta HTTP 201. Nenhum dado de cadastro é salvo no armazenamento do navegador.

## Login

- E-mail e senha com validações ao sair do campo e ao enviar, botão de mostrar/ocultar senha e bloqueio de envios duplicados.
- Envio para `POST /users/login` com `credentials: 'include'`, usando a mesma `VITE_API_URL` do cadastro. Erros de credenciais, limite de tentativas e conexão são exibidos em português.
- O access token fica apenas no estado em memória. Senhas e tokens não são gravados em `localStorage` ou `sessionStorage`. O backend gerencia o refresh token por cookie HttpOnly.
- Ao abrir o app, `POST /users/refresh` tenta restaurar a sessão; chamadas simultâneas compartilham a mesma requisição para evitar rotação duplicada. Uma sessão expirada ou um servidor indisponível libera o formulário para novo login.
- O sucesso mostra a confirmação de acesso e a opção de sair (`POST /users/logout`). O cabeçalho passa a exibir “Minha conta”, e a sessão permanece disponível ao navegar pelo header.
- O backend deve permitir a origem exata do frontend em `FRONTEND_URL` e credenciais no CORS. Cookies em produção exigem HTTPS conforme a configuração existente do backend.

`Header`, `Footer`, `FormField`, `Avatar` e `Pagination` são componentes reutilizáveis, com estilos separados. Produtos leva ao catálogo em `/produtos`; Produtores leva a `/produtores`. “Como funciona” foi removido do header; o menu da conta contém “Ver marketplace” e “Sair da conta”. Ajuda, termos e privacidade ainda exibem uma mensagem de indisponibilidade. Os textos jurídicos precisam ser fornecidos antes do uso em produção.

## Verificar

```powershell
npm.cmd run build
npm.cmd test
```

Os testes cobrem validação de documentos, máscaras, confirmação de senha, aceite, contatos opcionais, navegação interna e o contrato de login/refresh/logout com respostas simuladas. A integração real depende do backend configurado e de seu banco de dados.

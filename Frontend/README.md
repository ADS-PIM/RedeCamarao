# RedeCamarão — Frontend

Interface em React, TypeScript e Vite. O marketplace está disponível em `/` e `/marketplace`; os produtos, em `/produtos`; o cadastro, em `/registro`; o login, em `/entrar` e `/login`.

## Marketplace

- Tela responsiva com apresentação, categorias e ofertas ativas carregadas do banco de dados.
- Busca por produto, descrição, tamanho e localização; filtros por tipo, tamanho, peso e região usam os dados retornados pela API.
- Os detalhes da oferta incluem descrição, localização, quantidade, preço e período de disponibilidade.
- Quando a API retorna uma lista vazia, a tela informa que nenhuma oferta foi encontrada. Falhas de conexão ou respostas inválidas são exibidas separadamente e permitem tentar novamente.
- O marketplace consome `GET /offer/marketplace`, uma rota pública que retorna somente ofertas ativas dentro do período de disponibilidade, sem expor o ID do anunciante.
- Fotografias ilustrativas locais em `public/images`; fontes em `public/images/SOURCES.md`.

## Produtos

- `/produtos` e `/produtos/` exibem o catálogo, com o link Produtos ativo no header. “Ver todas” no marketplace também leva ao catálogo, sem recarregar o header.
- Busca por oferta, descrição, tamanho e região; filtros combinados por cidade/estado, faixa de preço por kg, tamanho e quantidade disponível. As opções de um mesmo grupo se somam; grupos diferentes se combinam. Os filtros são aplicados pelo botão e podem ser removidos pelos chips ou por “Limpar tudo”.
- Preços aceitam vírgula decimal e separador de milhares; valores inválidos ou intervalos invertidos recebem orientação antes de aplicar.
- Ordenação por mais recentes (ordem retornada pela API), menor/maior preço e maior quantidade; paginação real de seis ofertas por página.
- O catálogo consome a mesma API pública de ofertas. Fotos locais identificadas como ilustrativas compõem os cards, pois o contrato público atual não fornece fotos nem nomes dos anunciantes. Não são criados anúncios ou nomes de produtores fictícios.
- Filtros laterais no desktop; painel expansível até 1000px. Cards em 3/2/1 colunas, campos de 16px e controles adaptados para toque. Header e footer mantêm os padrões compartilhados.
- Carregamento, falha com nova tentativa, catálogo vazio, busca sem resultados e detalhes acessíveis da oferta têm estados próprios. O carregamento e o modal são compartilhados com o marketplace.

## Padrão visual e responsividade

A Feira do Agricultor foi usada como referência de organização: estilos próximos dos componentes, cores compartilhadas, conteúdo com largura máxima e grids que se adaptam à tela. A identidade azul da RedeCamarão permanece como base para as próximas telas.

- O container compartilhado ocupa 89% da tela, com largura máxima de 1800px, mantendo logo e ações próximos às laterais como no wireframe. As cores e o contraste dos textos secundários ficam em `src/index.css`.
- O header concentra seus estilos em `components/Header.css`: área interna de 80px no desktop e 64px até 1000px, logo de 24px e botões de pelo menos 44px. As páginas não devem sobrescrever essas medidas. O menu móvel abre sobre o conteúdo e fecha por Escape, clique fora ou navegação.
- O marketplace usa títulos fluidos, categorias em 5/3/2/1 colunas e ofertas em 4/2/1 colunas. Em telas de até 600px, o botão de busca fica abaixo do campo; o texto do campo mantém 16px para leitura em celulares.
- A busca e os atalhos respeitam a preferência de movimento reduzido. Os estados de carregamento e erro não apresentam contagens de ofertas como se os dados já estivessem disponíveis.
- O cadastro tem largura máxima própria de 1200px, com título de até 44px e formulário proporcional, sem alterar a largura do header. Até 1000px, o conteúdo passa para uma coluna.
- A navegação interna usa a History API e mantém o header e a sessão montados, evitando o recarregamento completo que causava a piscada entre páginas. Voltar/avançar, âncoras e posições de rolagem são tratados pelo hook `useNavigation`; links externos, downloads e abertura em nova aba mantêm o comportamento do navegador.

## Executar

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Configure `VITE_API_URL` no `.env` com a URL do backend, sem barra final ou caminho de endpoint. Reinicie o Vite depois de alterar a variável. O exemplo usa `http://localhost:3000`; inicie o backend nessa porta (`$env:PORT = '3000'` antes de executar seu script de desenvolvimento), pois o backend e o Vite usam 5173 por padrão. O `FRONTEND_URL` do backend deve permitir a origem do frontend.

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

`Header`, `Footer` e `FormField` são componentes reutilizáveis, com estilos separados. Produtos leva ao catálogo em `/produtos`; Como funciona leva à apresentação do marketplace. Ajuda, termos e privacidade ainda exibem uma mensagem de indisponibilidade. Os textos jurídicos precisam ser fornecidos antes do uso em produção.

## Verificar

```powershell
npm.cmd run build
npm.cmd test
```

Os testes cobrem validação de documentos, máscaras, confirmação de senha, aceite, contatos opcionais, navegação interna e o contrato de login/refresh/logout com respostas simuladas. A integração real depende do backend configurado e de seu banco de dados.

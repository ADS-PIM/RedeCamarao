# RedeCamarão — Frontend

Interface em React, TypeScript e Vite. O marketplace está disponível em `/` e `/marketplace`; o cadastro, em `/registro`; o login, em `/entrar` e `/login`.

## Marketplace

- Tela responsiva com apresentação, categorias e ofertas ativas carregadas do banco de dados.
- Busca por produto, descrição, tamanho e localização; filtros por tipo, tamanho, peso e região usam os dados retornados pela API.
- Os detalhes da oferta incluem descrição, localização, quantidade, preço e período de disponibilidade.
- Quando a API retorna uma lista vazia, a tela informa que nenhuma oferta foi encontrada. Falhas de conexão ou respostas inválidas são exibidas separadamente e permitem tentar novamente.
- O marketplace consome `GET /offer/marketplace`, uma rota pública que retorna somente ofertas ativas dentro do período de disponibilidade, sem expor o ID do anunciante.
- Fotografias ilustrativas locais em `public/images`; fontes em `public/images/SOURCES.md`.

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
- O sucesso mostra a confirmação de acesso e a opção de sair (`POST /users/logout`). O cabeçalho passa a exibir “Minha conta”. Não há redirecionamento para o marketplace enquanto essa página não estiver implementada.
- O backend deve permitir a origem exata do frontend em `FRONTEND_URL` e credenciais no CORS. Cookies em produção exigem HTTPS conforme a configuração existente do backend.

`Header`, `Footer` e `FormField` são componentes reutilizáveis, com estilos separados. A navegação de produtos, produtores e funcionamento leva às seções do marketplace. Ajuda, termos e privacidade ainda exibem uma mensagem de indisponibilidade. Os textos jurídicos precisam ser fornecidos antes do uso em produção.

## Verificar

```powershell
npm.cmd run build
npm.cmd test
```

Os testes cobrem validação de documentos, máscaras, confirmação de senha, aceite, contatos opcionais e o contrato de login/refresh/logout com respostas simuladas. A integração real depende do backend configurado e de seu banco de dados.

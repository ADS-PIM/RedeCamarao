# RedeCamarão — Frontend

Interface em React, TypeScript e Vite. A tela de cadastro está disponível em `/` e `/registro`; o login, em `/entrar` e `/login`.

## Executar

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Configure `VITE_API_URL` no `.env` com a URL do backend, sem barra final ou caminho de endpoint. Reinicie o Vite depois de alterar a variável. O exemplo usa `http://localhost:3000`; inicie o backend nessa porta (`$env:PORT = '3000'` antes de executar seu script de desenvolvimento), pois o backend e o Vite usam 5173 por padrão. O `FRONTEND_URL` do backend deve permitir a origem do frontend.

## Cadastro

- Etapa 1: comprador/produtor, nome, CPF/CNPJ, e-mail, senha, confirmação e aceite.
- Etapa 2: telefone e localização opcionais, conforme o contrato existente.
- Validações ao sair do campo e ao continuar; campos já visitados atualizam o feedback durante a edição.
- Envio para `POST /users/register`, com `BUYER`/`PRODUCER` e documento/telefones normalizados. Confirmação de senha e aceite não são enviados ao DTO.
- Sucesso exibido somente após resposta HTTP 201. Nenhum dado de cadastro é salvo no armazenamento do navegador.

## Login

- E-mail e senha com validações ao sair do campo e ao enviar, botão de mostrar/ocultar senha e bloqueio de envios duplicados.
- Envio para `POST /users/login` com `credentials: 'include'`, usando a mesma `VITE_API_URL` do cadastro. Erros de credenciais, limite de tentativas e conexão são exibidos em português.
- O access token fica apenas no estado em memória. Senhas e tokens não são gravados em `localStorage` ou `sessionStorage`. O backend gerencia o refresh token por cookie HttpOnly.
- Ao abrir o app, `POST /users/refresh` tenta restaurar a sessão; chamadas simultâneas compartilham a mesma requisição para evitar rotação duplicada. Uma sessão expirada ou um servidor indisponível libera o formulário para novo login.
- O sucesso mostra a confirmação de acesso e a opção de sair (`POST /users/logout`). O cabeçalho passa a exibir “Minha conta”. Não há redirecionamento para o marketplace enquanto essa página não estiver implementada.
- O backend deve permitir a origem exata do frontend em `FRONTEND_URL` e credenciais no CORS. Cookies em produção exigem HTTPS conforme a configuração existente do backend.

`Header`, `Footer` e `FormField` são componentes reutilizáveis, com estilos separados. As demais páginas vinculadas (marketplace, produtos, produtores, ajuda, termos e privacidade) ainda não foram implementadas e exibem uma mensagem de indisponibilidade. Os textos jurídicos precisam ser fornecidos antes do uso em produção.

## Verificar

```powershell
npm.cmd run build
npm.cmd test
```

Os testes cobrem validação de documentos, máscaras, confirmação de senha, aceite, contatos opcionais e o contrato de login/refresh/logout com respostas simuladas. A integração real depende do backend configurado e de seu banco de dados.

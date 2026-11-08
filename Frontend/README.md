# RedeCamarão — Frontend

Interface em React, TypeScript e Vite. A tela de cadastro está disponível em `/` e `/registro`.

## Executar

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Configure `VITE_API_URL` no `.env` com a URL do backend, sem barra final ou caminho de endpoint. Reinicie o Vite depois de alterar a variável. O exemplo usa `http://localhost:3000`; inicie o backend nessa porta (`$env:PORT = '3000'` antes de executar seu script de desenvolvimento), pois o backend e o Vite usam 5173 por padrão. O `FRONTEND_URL` do backend deve permitir a origem do frontend.

## Cadastro

- Etapa 1: comprador/produtor, nome, CPF/CNPJ, e-mail, senha, confirmação e aceite.
- Etapa 2: telefone, WhatsApp e localização opcionais, conforme o contrato existente.
- Validações ao sair do campo e ao continuar; campos já visitados atualizam o feedback durante a edição.
- Envio para `POST /users/register`, com `BUYER`/`PRODUCER` e documento/telefones normalizados. Confirmação de senha e aceite não são enviados ao DTO.
- Sucesso exibido somente após resposta HTTP 201. Nenhum dado de cadastro é salvo no armazenamento do navegador.

`Header` e `Footer` são componentes reutilizáveis, com estilos separados. As demais páginas vinculadas (login, marketplace, produtos, produtores, ajuda, termos e privacidade) ainda não foram implementadas e exibem uma mensagem de indisponibilidade. Os textos jurídicos precisam ser fornecidos antes do uso em produção.

## Verificar

```powershell
npm.cmd run build
npm.cmd test
```

Os testes cobrem validação de documentos, máscaras, confirmação de senha, aceite e contatos opcionais. A integração real depende do backend configurado e de seu banco de dados.

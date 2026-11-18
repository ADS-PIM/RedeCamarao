# PostgreSQL no Aiven

A API usa `pg` e as migrations usam Sequelize com o dialeto `postgres`.
Ambos carregam `Backend/.env` pela configuração compartilhada em
`database/config/connection.js`, independentemente do diretório do terminal.

## Conexão

Copie `.env.example` para `.env` somente se ainda não existir um arquivo de
ambiente. Preencha `DB_PASSWORD` com a senha do serviço. Preserve os segredos JWT
e as demais configurações que já existirem.

```dotenv
DB_HOST=redecamarao-elalerrandroads-6136.l.aivencloud.com
DB_PORT=13054
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=SENHA_DO_SERVICO
DB_SSL_MODE=require
DB_POOL_MAX=5
```

Também é possível definir `DATABASE_URL` com a Service URI do Aiven. Quando
preenchida, a URL tem prioridade sobre host, porta, banco, usuário e senha em
`DB_*`. `DB_SSL_MODE`, quando definido, tem prioridade sobre `sslmode` na URL.
Senhas com caracteres especiais precisam de URL encoding somente na URL.

`require` exige conexão criptografada, como a URI fornecida pelo Aiven, mas não
valida o certificado do servidor sem uma CA. Para validar também a identidade,
baixe o CA certificate do painel Aiven e configure:

```dotenv
DB_SSL_MODE=verify-full
DB_SSL_CA_PATH=database/certs/ca.pem
```

O caminho da CA é relativo a `Backend`. Também aceitamos `DB_SSL_CA` com o PEM
inline e quebras `\n`. A pasta de certificados e `.env` são ignorados pelo Git.
Em um PostgreSQL local sem TLS, use `DB_SSL_MODE=disable`.

O pool abre no máximo cinco conexões por processo por padrão. O serviço informado
permite vinte conexões: considere também as réplicas da API e as ferramentas de
administração. O rate limit persistente usa PostgreSQL por padrão; o valor de
`RATE_LIMIT_STORE`, se definido, deve ser `postgres` ou `memory` (apenas para
ambiente local). Em hospedagem, configure as mesmas variáveis no ambiente da API.

## Instalação e migrations

Execute em `Backend`:

```powershell
npm.cmd ci
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run dev
```

`db:check` verifica autenticação, SSL e tabelas sem alterar dados. A inicialização
da API verifica a conexão antes de abrir a porta HTTP e encerra com erro se o
banco não estiver acessível.

A migration `20261115120000-initialize-postgres.js` cria o schema atual, incluindo
usuários, ofertas, fotos, administradores, sessões, recuperação de senha e rate
limit. Ela inclui `RASCUNHO`, foto de perfil, índices, unicidade de e-mail sem
diferenciar maiúsculas de minúsculas, FKs com cascata e triggers de `updatedAt`.
As alterações de estrutura são transacionais. Sequelize registra a aplicação em
`SequelizeMeta`; execuções seguintes aplicam somente migrations pendentes.

A migration `20261118120000-support-gram-quantities.js` amplia `offers.weight`,
`min_quantity` e `max_quantity` para `numeric(11,3)`. A unidade armazenada
continua sendo kg, com precisão de 1 g, sem alterar os valores já existentes.
A reversão dessa migration é recusada quando arredondaria alguma quantidade.

O Aiven já fornece `defaultdb`. `db:init` é um alias de `db:migrate` e não tenta
criar outro banco. O SQL `RedeCamarao_db.sql` é uma alternativa para instalação
manual em banco vazio. Não combine a instalação manual com as migrations.

A reversão `npx.cmd sequelize-cli db:migrate:undo` remove as tabelas criadas pela
migration inicial e seus dados. Use somente em ambiente descartável ou com
backup e intenção explícita de remover o schema.

## Dados do MySQL

`database/legacy/mysql/` preserva o SQL e o histórico de migrations MySQL. Esses
arquivos não são executados na instalação PostgreSQL. O novo schema não importa
registros de um MySQL anterior; a transferência de dados é uma etapa separada.

## Validação

```powershell
npm.cmd run build
npm.cmd test
```

A suíte padrão usa mocks de PostgreSQL e não acessa o banco. Para validar as
migrations e os DAOs com um servidor real configurado no `.env`:

```powershell
$env:POSTGRES_INTEGRATION = '1'
npm.cmd run test:postgres
Remove-Item Env:POSTGRES_INTEGRATION
```

O teste cria um schema aleatório `redecamarao_test_*`, usa apenas esse schema e o
remove ao terminar. Requer permissão para criar schemas. Verifica a migration
`up/down/up`, datas, valores decimais, atualizações com parâmetros, autorização,
fotos, e-mails duplicados, rotação concorrente de tokens, recuperação de senha,
rate limit, cascatas e o fluxo HTTP de cadastro, login, perfil e ofertas.

Referências: [conexão Node.js no Aiven](https://aiven.io/docs/products/postgresql/howto/connect-node)
e [TLS do Aiven](https://aiven.io/docs/platform/concepts/tls-ssl-certificates).

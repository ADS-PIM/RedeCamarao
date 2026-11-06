# Banco de dados

As migrations em `migrations/` são o histórico de alterações. `RedeCamarao_db.sql`
representa o schema atual para criação manual; não execute esse arquivo sobre um
banco existente nem combine a criação manual com `db:init`.

## Migration de 01/11/2026

Em `Backend`, aplique com:

```powershell
npm.cmd run db:migrate
```

A migration `20261101120000-align-marketplace-schema.js`:

- Move localização e WhatsApp de `profiles` para `users`; acrescenta descrição,
  horário de funcionamento e `CPF_CNPJ CHAR(14)`. Remove a formatação dos
  documentos existentes e interrompe antes das alterações se algum ultrapassar
  14 caracteres. Documentos ausentes e textos novos começam vazios.
- Converte `PRODUCER` em `PRODUTOR`, e `BUYER`/`REVENDEDOR` em `COMPRADOR`.
  O DAO mantém `PRODUCER`/`BUYER` no contrato HTTP atual.
- Remove `offers.type`. Converte `quantity` em `max_quantity` e
  `availability_date` em `start_availability_date`; a data final recebe a data
  inicial. Peso e quantidade mínima começam em `0`, pois não existiam no modelo
  anterior. Esses valores precisam ser completados conforme cada oferta.
- Torna a descrição de ofertas obrigatória e acrescenta descrição às fotos;
  descrições ausentes começam vazias.
- Renomeia `administrators.profile_picture` para `profilePicture` e permite
  `role VARCHAR(50)`. O DAO preserva `profile_picture` nas respostas atuais.
- Mantém `refresh_tokens` exclusivamente para administradores, com FK
  `adminId -> administrators.id`, e cria `user_refresh_tokens` se ausente, com
  FK `userId -> users.id`, hash único e exclusão em cascata. Tokens já existentes
  são preservados. O `tokenHash VARCHAR(281)` dos administradores é mantido porque
  a autenticação atual armazena JWTs completos; os usuários usam `CHAR(64)`.
- Mantém conversas, mensagens, recuperação de senha e rate limit.

`profiles_legacy_20261101` guarda os perfis antigos, inclusive nome comercial e
telefone, que não têm campos equivalentes no diagrama. `offer_types_legacy_20261101`
guarda os tipos removidos das ofertas. São arquivos de migração sem FKs, não
tabelas usadas pela aplicação. Mantenha-os enquanto precisar da reversão.

Pare as escritas da aplicação e faça backup antes de aplicar: DDL de MySQL/MariaDB
tem commit implícito. A migration admite nova execução de `up` após interrupção,
mas não promete rollback transacional de alterações de estrutura.

## Remoção de conversas e mensagens

A migration `20261101130000-remove-conversations-and-messages.js` remove
`messages` antes de `conversations`, respeitando a chave estrangeira entre elas.
Ela é aplicada pelo mesmo comando `npm.cmd run db:migrate` e exclui os dados
dessas duas tabelas. Seu `down` recria as estruturas e os relacionamentos vazios;
os registros excluídos só podem ser recuperados de um backup.

## Reversão

Cada execução desfaz apenas a última migration aplicada. A reversão da cascata
de usuários para ofertas restaura `ON DELETE RESTRICT`, sem recuperar registros
excluídos. Ao chegar à migration de remoção de conversas e mensagens, a reversão
recria essas duas tabelas vazias. A execução seguinte reverte o alinhamento do
marketplace descrito abaixo.

```powershell
npx.cmd sequelize-cli db:migrate:undo
```

O `down` restaura o modelo da migration inicial, recuperando perfis e tipos
arquivados dos registros ainda existentes. Novas ofertas recebem tipo vazio.
Revendedores convertidos continuam como compradores. Campos introduzidos nesta
migration e sessões de usuários são removidos, inclusive se CPF/CNPJ ou a tabela
de tokens de usuários já tivessem sido acrescentados manualmente antes dela.
Faça backup desses dados antes de reverter. Os tokens de administradores são
preservados. Se houver cargos diferentes de `ADMIN`/`SUPER_ADMIN`, a reversão é
interrompida antes das alterações. Reverta também o código dos DAOs junto do banco.

## Teste de integração

Usa bancos temporários com nomes aleatórios `redecamarao_schema_test_*`, que são
removidos ao terminar. Não lê `.env` nem usa `DB_NAME`. Requer um servidor de teste
MySQL/MariaDB e permissão para criar/remover esses bancos.

```powershell
$env:MIGRATION_TEST_MYSQL = '1'
npm.cmd run test:migration
```

O padrão é `127.0.0.1:3306`, usuário `root`, senha vazia. Para outro servidor de
teste, configure `MIGRATION_TEST_HOST`, `MIGRATION_TEST_PORT`,
`MIGRATION_TEST_USER` e `MIGRATION_TEST_PASSWORD`. Sem a flag
`MIGRATION_TEST_MYSQL=1`, os testes de integração são pulados.

A suíte verifica dados antigos, documentos formatados, compatibilidade dos DAOs,
FKs, collations distintas e separação dos tokens, reaplicação, reversão e equivalência entre o SQL de
referência e o histórico completo de migrations.

## Exclusão de usuários, ofertas e fotos

A migration `20261106120000-cascade-user-offer-deletion.js` altera a FK
`offers.userId -> users.id` para `ON DELETE CASCADE`, mantendo `ON UPDATE CASCADE`.
A FK `offerPhotos.offerId -> offers.id` já possui as mesmas cascatas.

Com isso, excluir uma oferta remove suas fotos; excluir um usuário remove todas
as suas ofertas e fotos, inclusive em exclusões SQL diretas. A FK de
`user_refresh_tokens` também remove os tokens do usuário. A aplicação autoriza
edição e exclusão de ofertas somente para seu dono; `DELETE /users/me` usa a
identidade do token.

A migration descobre o nome real da FK, pois ele pode variar entre o histórico
Sequelize e o SQL de referência. Ela substitui a FK em um único `ALTER TABLE`,
preserva registros existentes e pode ser reaplicada quando a cascata já estiver
configurada. Uma relação ausente ou ambígua interrompe a migration antes do DDL.
O `down` restaura a restrição de exclusão de usuários com ofertas, sem recuperar
dados excluídos. Os arquivos de imagens em provedores externos não fazem parte
das cascatas; somente os registros do banco são excluídos.

Em `Backend`, com a conexão do ambiente configurada, aplique com:

```powershell
npm.cmd run db:migrate
```

## Testes das exclusões em cascata

`npm.cmd run test:offer-delete` executa os testes HTTP de autorização/exclusão
e os testes unitários da migration. Para incluir a integração com MySQL real,
configure um servidor de teste e execute:

```powershell
$env:MIGRATION_TEST_MYSQL = '1'
$env:MIGRATION_TEST_HOST = '127.0.0.1'
$env:MIGRATION_TEST_PORT = '3306'
$env:MIGRATION_TEST_USER = 'root'
$env:MIGRATION_TEST_PASSWORD = ''
npm.cmd run test:offer-delete
```

Esses testes criam e removem apenas bancos com nomes aleatórios
`redecamarao_cascade_test_*`, sem usar `DB_NAME` nem acessar o banco configurado
na aplicação. O servidor de teste precisa permitir criar/remover esses bancos.
A integração aplica o histórico de migrations, valida `up`/`down`, preservação
de registros, exclusões SQL e HTTP, permissões, isolamento entre usuários e as
cascatas do SQL de referência. Sem a flag, a integração é pulada.

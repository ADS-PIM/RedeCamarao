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

## Reversão

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

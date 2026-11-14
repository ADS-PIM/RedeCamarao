# Ofertas

O CRUD das fotos vinculadas às ofertas está documentado em [Fotos das ofertas](offer-photos.md).

## Ofertas públicas do marketplace

`GET /offer/marketplace`

Não requer autenticação. Retorna somente ofertas com status `ATIVO` cuja data
de início já chegou e cuja data de término ainda não passou, ordenadas da mais
recente para a mais antiga. O retorno `200` é um array de objetos com
`id`, `title`, `description`, `type`, `size`, `price`, `weight`,
`maximumQuantity`, `minimumQuantity`, `location`, `startDate` e `endDate`.
O `userId` do anunciante não é exposto.

- `200 []`: nenhuma oferta ativa disponível no período atual.
- `500`: erro interno, sem detalhes do banco na resposta.

## Buscar ofertas (SearchOffer)

`GET /offer/search`

Requer `Authorization: Bearer <accessToken>`. Retorna ofertas de todos os usuários
e de todos os status, da mais recente para a mais antiga (`createdAt DESC`,
desempate por `id DESC`). Não requer parâmetros nem corpo na requisição.

```http
GET /offer/search
Authorization: Bearer <accessToken>
```

O retorno `200` é um array de `OfferSearchDTO`, com os mesmos campos de
`OfferSearchByUserIdDTO`, acrescidos de `userId`: `id`, `userId`, `title`, `type`,
`size`, `price`, `weight`, `location`, `startDate`, `endDate` e `status`.
Decimais, datas e status seguem as conversões descritas abaixo.

- `200 []`: nenhuma oferta cadastrada.
- `401`: token ausente, inválido ou expirado.
- `500`: erro interno, sem detalhes do banco na resposta.

## Listar ofertas por usuário

`GET /offer/user/:userId`

Requer `Authorization: Bearer <accessToken>`. O `userId` vem da URL:
um usuário autenticado pode consultar as ofertas de outro usuário, assim como
na consulta autenticada de perfil. A listagem inclui todos os status e retorna
as ofertas da mais recente para a mais antiga (`createdAt DESC`, desempate por `id DESC`).

Exemplo:

```http
GET /offer/user/bd9fb70b-af5f-4f72-9e18-a841db772d81
Authorization: Bearer <accessToken>
```

O retorno `200` é um array de objetos no formato `OfferSearchByUserIdDTO`, com
`id`, `title`, `description`, `type`, `size`, `price`, `weight`,
`minimumQuantity`, `maximumQuantity`, `location`, `startDate`, `endDate`,
`status` e `createdAt`. Descrição e limites permitem editar e duplicar ofertas
sem perder dados; `createdAt` identifica a publicação, não a última atualização.
Valores decimais são números JSON;
datas são serializadas em ISO 8601. `type` e `size` são atributos separados;
`type` pode ser `null` em registros legados.

Os status do banco são convertidos para o contrato da API:

| Banco | API |
| --- | --- |
| ATIVO | ACTIVE |
| PAUSADO | INACTIVE |
| VENDIDO | SOLD_OUT |
| CANCELADO | CANCELLED |
| EXPIRADO | EXPIRED |

- `200 []`: usuário existente sem ofertas.
- `400`: ID vazio ou maior que 36 caracteres.
- `401`: token ausente, inválido ou expirado.
- `404`: usuário não encontrado.
- `500`: erro interno, sem detalhes do banco na resposta.

O banco deve ter as migrations existentes aplicadas, incluindo a restauração
de `offers.type` e `20261104120000-add-expired-offer-status.js` para suportar `EXPIRED`.

Validação automatizada: `npm.cmd run build` e `npm.cmd run test:offer-list`.
O contrato necessário ao painel também é verificado sem banco por
`npm.cmd run test:producer-dashboard`.
Os testes exercitam a rota HTTP com consultas MySQL simuladas.

## Atualizar oferta

`PATCH /offer/:id`

Requer `Authorization: Bearer <accessToken>`. Apenas o dono da oferta pode
atualizá-la; sua identidade vem do token. Envie somente os campos que deseja
alterar. Campos omitidos mantêm os valores atuais.

```http
PATCH /offer/c58d2304-f74f-42db-8e57-4ca50b1c642e
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "Camarão fresco",
  "price": 42.50,
  "maximumQuantity": 100,
  "minimumQuantity": 5,
  "status": "ACTIVE"
}
```

Campos editáveis: `title`, `description`, `type`, `size`, `price`, `weight`,
`maximumQuantity`, `minimumQuantity`, `location`, `startDate`, `endDate` e `status`.
`id`, `userId`, `createdAt`, `updatedAt` e qualquer campo desconhecido no corpo
causam `400`. `updatedAt` continua sendo gerenciado automaticamente pelo MySQL.

- Textos têm os limites do schema: 255 caracteres, exceto `description` (1000).
  Textos aceitam `""` ou espaços conforme o DTO atual; `type` também aceita `null`.
  Os demais campos rejeitam `null`, pois suas colunas são obrigatórias.
- Valores numéricos aceitam até duas casas decimais, entre `-99999999.99` e
  `99999999.99`. Zero e números negativos são aceitos conforme o DTO atual;
  strings numéricas são rejeitadas.
- Datas ISO 8601 devem ser válidas, entre os anos 1000 e 9999. Valores com horário
  são normalizados para `YYYY-MM-DD`, preservando o dia informado, sem conversão de fuso.
  A data final não pode preceder a inicial, e a quantidade mínima não pode exceder
  a máxima. A validação combina o PATCH com os valores salvos e também verifica
  os intervalos atomicamente no UPDATE.
- Status aceitos: todos os valores de `OfferStatus`, incluindo `EXPIRED`, com o
  mapeamento da tabela acima. A migration de status deve estar aplicada no banco.

Respostas:

- `200 { "message": "Offer updated successfully" }`: atualização concluída.
- `400`: corpo vazio, ID ou campos inválidos, campos protegidos ou intervalos incoerentes.
- `401`: token ausente, inválido ou expirado.
- `403`: oferta pertence a outro usuário.
- `404`: oferta não encontrada.
- `409`: oferta removida ou alterada durante a operação, impedindo a atualização;
  consulte os dados atuais antes de tentar novamente.
- `500`: erro interno sem detalhes do banco na resposta.

Execute `npm.cmd run db:migrate` no backend para aplicar a migration de status.
O rollback é bloqueado enquanto houver ofertas com status `EXPIRADO`, evitando
perda de informação. A criação continua exigindo os campos do `OfferCreateDTO`,
inclusive `minimumQuantity` positivo; datas com horário são normalizadas da mesma
forma que na atualização.

Erros esperados usam `ApplicationError.code` para definir o status HTTP. A mensagem
em português pode ser editada sem alterar o tratamento de `400`, `403`, `404` ou `409`.
Erros inesperados continuam retornando `500` com mensagem genérica.

Testes: `npm.cmd run test:offer` e `npm.cmd run test:application-errors`.
As consultas MySQL e operações da migration são simuladas.

## Excluir oferta e permissões de escrita

`DELETE /offer/:id`

Requer `Authorization: Bearer <accessToken>`. Assim como no `PATCH /offer/:id`,
somente o dono da oferta pode excluí-la. O ID do usuário vem exclusivamente do
token; enviar `userId` na URL ou no corpo não concede permissão sobre outra oferta.
A propriedade é verificada no caso de uso e novamente no `WHERE` da escrita SQL.

```http
DELETE /offer/c58d2304-f74f-42db-8e57-4ca50b1c642e
Authorization: Bearer <accessToken>
```

- `200 { "message": "Oferta excluída com sucesso" }`: oferta excluída.
- `400`: ID vazio ou maior que 36 caracteres.
- `401`: token ausente, inválido ou expirado.
- `403`: oferta pertence a outro usuário.
- `404`: oferta não encontrada.
- `409`: oferta removida ou dono alterado entre a leitura e a exclusão.
- `500`: falha inesperada, sem detalhes do banco.

## Exclusões em cascata

As regras são garantidas por chaves estrangeiras do MySQL, inclusive quando
a exclusão é feita diretamente no banco:

- Excluir uma oferta exclui todos os seus registros em `offerPhotos`.
- Excluir um usuário exclui todas as suas ofertas e, consequentemente, todas
  as fotos dessas ofertas. Os tokens de refresh do usuário também são removidos
  pela cascata já existente.
- Ofertas, fotos e usuários que não pertencem ao registro excluído são preservados.

`DELETE /users/me` continua excluindo a conta identificada pelo token, retorna
`204` e limpa o cookie de refresh. A cascata permite excluir a conta mesmo
quando ela possui ofertas. A exclusão remove os registros de fotos; URLs externas
não dão ao backend acesso para excluir os arquivos no provedor de imagens.

Para habilitar a cascata entre usuários e ofertas em bancos existentes, aplique
`20261106120000-cascade-user-offer-deletion.js` executando, em `Backend`:

```powershell
npm.cmd run db:migrate
```

O SQL de referência já inclui `ON DELETE CASCADE` nas duas relações. A migration
preserva os registros atuais; seu `down` restaura `RESTRICT` entre usuários e
ofertas, sem recuperar dados que tenham sido excluídos depois da aplicação.

Validação das permissões, exclusão e migration: `npm.cmd run test:offer-delete`.
Os testes MySQL reais são opcionais e usam bancos temporários; consulte
[as instruções do banco](../database/README.md#testes-das-exclusões-em-cascata).

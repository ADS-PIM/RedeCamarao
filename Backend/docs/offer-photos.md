# Fotos das ofertas

CRUD da tabela `offerPhotos`, seguindo o fluxo de rotas Express, controller,
DTOs, casos de uso, interface de DAO e persistência MySQL do backend.

Todas as rotas exigem `Authorization: Bearer <accessToken>` de usuário.
Somente o dono da oferta pode cadastrar, atualizar ou excluir suas fotos.
Qualquer usuário autenticado pode consultar as fotos de uma oferta, seguindo
a mesma regra de consulta das ofertas.

| Operação | Método e rota | Sucesso |
| --- | --- | --- |
| create | `POST /offerPhotos/create` | `201`, mensagem e foto criada |
| update | `PATCH /offerPhotos/:id` | `200`, mensagem de confirmação |
| searchByOfferId | `GET /offerPhotos/offer/:offerId` | `200`, array de fotos |
| delete | `DELETE /offerPhotos/:id` | `200`, mensagem de confirmação |

O `:id` da atualização e da exclusão é o ID da **foto**. O `:offerId` da consulta
é o ID da **oferta**.

## Cadastrar uma foto

```http
POST /offerPhotos/create
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "offerId": "c58d2304-f74f-42db-8e57-4ca50b1c642e",
  "imageUrl": "https://example.com/camarao.jpg",
  "description": "Camarão fresco disponível para venda"
}
```

- `offerId`: obrigatório, texto não vazio de até 36 caracteres; a oferta deve existir.
- `imageUrl`: obrigatória, URL absoluta HTTP ou HTTPS de até 2048 caracteres.
- `description`: opcional, texto de até 500 caracteres. Quando omitida, fica `""`.
- `id`: UUID gerado pelo backend. Não deve ser enviado no corpo.
- Campos desconhecidos e valores `null` são rejeitados.

Resposta `201`:

```json
{
  "message": "Foto da oferta cadastrada com sucesso",
  "photo": {
    "id": "c8b3dd27-4587-432b-8397-7a39f8e5aa15",
    "offerId": "c58d2304-f74f-42db-8e57-4ca50b1c642e",
    "imageUrl": "https://example.com/camarao.jpg",
    "description": "Camarão fresco disponível para venda"
  }
}
```

O cadastro recebe a URL de uma imagem já hospedada. Cada chamada cria uma foto;
várias fotos podem pertencer à mesma oferta. A API armazena a URL sem baixar ou
enviar arquivos para um provedor de imagens.

## Atualizar uma foto

```http
PATCH /offerPhotos/c8b3dd27-4587-432b-8397-7a39f8e5aa15
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "imageUrl": "https://example.com/camarao-atualizado.jpg",
  "description": "Foto atualizada do produto"
}
```

Envie `imageUrl`, `description` ou ambos. Campos omitidos mantêm o valor salvo.
Os limites e a validação da URL são os mesmos do cadastro. `description: ""`
limpa a descrição. Repetir o valor atual também é uma atualização válida.

Corpo vazio, `null`, campos desconhecidos e campos protegidos (`id`, `offerId`,
`userId`, `createdAt`, `updatedAt`) causam `400`. A foto permanece vinculada à
oferta original; a identidade do usuário vem exclusivamente do token.

Resposta `200`:

```json
{ "message": "Foto da oferta atualizada com sucesso" }
```

## Buscar fotos por oferta

```http
GET /offerPhotos/offer/c58d2304-f74f-42db-8e57-4ca50b1c642e
Authorization: Bearer <accessToken>
```

Resposta `200`: array de `OfferPhotoSearchDTO`, com `id`, `offerId`, `imageUrl`
e `description`. A consulta retorna apenas as fotos da oferta indicada, em
ordem determinística por `id ASC`. Essa ordem não representa a data de cadastro,
pois a tabela não tem coluna de data.

```json
[
  {
    "id": "c8b3dd27-4587-432b-8397-7a39f8e5aa15",
    "offerId": "c58d2304-f74f-42db-8e57-4ca50b1c642e",
    "imageUrl": "https://example.com/camarao.jpg",
    "description": "Camarão fresco disponível para venda"
  }
]
```

Oferta existente sem fotos retorna `200 []`. Oferta inexistente retorna `404`.

## Excluir uma foto

```http
DELETE /offerPhotos/c8b3dd27-4587-432b-8397-7a39f8e5aa15
Authorization: Bearer <accessToken>
```

Resposta `200`:

```json
{ "message": "Foto da oferta excluída com sucesso" }
```

Exclui somente o registro da foto indicada. A oferta e as demais fotos são
preservadas. O arquivo hospedado no endereço `imageUrl` não é excluído.
Uma nova tentativa de excluir a mesma foto retorna `404`.

### Exclusão da oferta ou do usuário

`DELETE /offer/:id` permite ao dono excluir a oferta e remove automaticamente
todas as suas fotos. Ao excluir o usuário (`DELETE /users/me`), o banco remove
suas ofertas e todas as respectivas fotos. As duas cascatas também valem para
exclusões SQL diretas, preservando os dados de outros usuários. Elas excluem
os registros em `offerPhotos`; os arquivos hospedados nas URLs não são removidos.

## Erros e persistência

- `400`: ID vazio ou maior que 36 caracteres, corpo ou campos inválidos.
- `401`: token ausente, inválido, expirado ou token de refresh.
- `403`: tentativa de cadastrar, atualizar ou excluir foto de oferta de outro usuário.
- `404`: oferta ou foto não encontrada.
- `409`: a escrita deixou de corresponder à foto, à oferta ou ao dono validado
  na leitura; recarregue os dados antes de tentar novamente.
- `500`: falha inesperada, com mensagem genérica sem detalhes do banco.

Os erros de negócio usam `ApplicationError.code`, incluindo
`OFFER_PHOTO_NOT_FOUND` (`404`) e `OFFER_PHOTO_WRITE_CONFLICT` (`409`).
Todas as consultas usam parâmetros. A criação verifica o dono em
`INSERT ... SELECT`; a atualização e a exclusão também verificam oferta e dono
na própria escrita SQL, protegendo a autorização entre leitura e gravação.

O schema atual já contempla os quatro campos. Em bancos antigos, a migration
existente `20261101120000-align-marketplace-schema.js` adiciona `description`
com padrão `""`. A migration `20261106120000-cascade-user-offer-deletion.js`
habilita a cascata de usuários para ofertas; a cascata de ofertas para fotos
já existe desde a migration inicial. O banco precisa ter as migrations
aplicadas. Para aplicá-las, execute
`npm.cmd run db:migrate` a partir de `Backend` no ambiente desejado.

## Validação automatizada

Execute em `Backend`:

```powershell
npm.cmd run build
npm.cmd run test:offer-photos
npm.cmd run test:application-errors
```

Os testes exercitam o app Express real, autenticação JWT, DTOs, casos de uso e
DAOs com consultas MySQL simuladas. Cobrem o ciclo CRUD, isolamento entre ofertas,
permissões, limites dos campos, erros, consultas parametrizadas e conflitos
entre a leitura e a escrita. Não validam uma instância MySQL real nem aplicam migrations.

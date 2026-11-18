# Fotos das ofertas

## Configuração do Cloudinary

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`
no arquivo `Backend/.env` e no ambiente de hospedagem do backend. O arquivo é
carregado por caminho absoluto, inclusive quando o servidor inicia na raiz do
repositório. As credenciais ficam exclusivamente no backend. Reinicie o servidor
após alterá-las. O arquivo `.env.example` contém os nomes das variáveis.

O envio usa o SDK oficial com `upload_stream`, assinatura no servidor e
`resource_type: image`. Somente JPG/PNG de até 10 MB são aceitos. As imagens ficam
em `redecamarao/offers/<uuid>` ou `redecamarao/profiles/<uuid>`; o banco PostgreSQL
armazena a URL HTTPS (`secure_url`). Não é necessário alterar o schema do banco.
O identificador de exclusão é recuperado apenas das URLs geradas pela aplicação,
na conta configurada. Referência: [Upload API do Cloudinary](https://cloudinary.com/documentation/image_upload_api_reference).

## Edição conjunta da oferta e das fotos

O frontend oferece ajuste de enquadramento para perfil e ofertas, com arraste,
zoom e posição. O recorte é gerado localmente em JPG/PNG; a API continua
recebendo a imagem em `data`, sem metadados de recorte ou alteração do schema.
Nas ofertas, reenquadrar uma foto existente envia uma nova imagem sem `id`,
na mesma posição da galeria. A imagem anterior só é liberada após o commit.

`POST /offer/editor` cadastra e `PUT /offer/:id/editor` atualiza. Ambos exigem
`Authorization: Bearer <accessToken>` e recebem
`{ offer, photos }`. `offer` contém todos os campos editáveis do lote e status
`ACTIVE`, `INACTIVE` ou `DRAFT`. `photos` é um array ordenado de até cinco itens:

- Foto existente: `{ id, description }`. O ID precisa pertencer à oferta.
- Foto nova: `{ data, description }`, onde `data` é uma data URL base64 JPG/PNG
  de até 10 MB decodificados. O backend verifica tamanho e assinatura do formato.

O primeiro item será a capa. O salvamento confirma a propriedade da oferta,
grava os dados e substitui os registros da galeria na mesma transação. Os IDs
das fotos são renovados em ordem para manter compatibilidade com as consultas
existentes que usam `ORDER BY id ASC`; nenhum campo de ordenação ou migration
é necessário. A resposta `200` inclui `photos` com os novos IDs e URLs.

O cadastro retorna `201` com `id` e `photos`; apenas produtores podem cadastrar.
Fotos existentes não podem ser vinculadas a uma oferta nova. O status `DRAFT`
é persistido como `RASCUNHO`, incluído pela migration específica do enum. Os
campos obrigatórios do lote são validados também para rascunhos.

Fotos novas são enviadas em paralelo ao Cloudinary, sem gravar arquivos locais.
Todos os envios terminam antes da confirmação ou reversão da transação. Uma
falha no envio ou na gravação reverte os registros e tenta remover os novos
arquivos da tentativa; fotos anteriores são preservadas. Depois do commit,
imagens retiradas da galeria são removidas se não estiverem mais em uso.

O frontend continua enviando JSON com data URLs base64 e recebendo `imageUrl`,
sem necessidade de multipart ou upload direto pelo navegador. As rotas mantêm
os limites de cinco fotos e 10 MB por foto. O tempo de espera do frontend para
salvar fotos é de 60 segundos; cada upload ao provedor tem timeout de 20 segundos.

URLs antigas em `/uploads/...` continuam sendo servidas pelo backend quando os
arquivos existem. Não há migração automática ou exclusão desses arquivos locais.
`PUBLIC_API_URL` não determina as URLs das novas imagens.

## Foto de perfil

`PUT /users/me/photo` exige o token de usuário e recebe `{ "data": "data:image/png;base64,..." }`
ou `{ "data": null }` para remover a foto. Aceita JPG/PNG de até 10 MB. O usuário
vem exclusivamente do token; compradores e produtores podem alterar a própria
foto. A resposta é `{ "profilePicture": "https://res.cloudinary.com/..." }` ou
`{ "profilePicture": null }`. A foto antiga só é liberada após o commit.

## Limpeza de imagens

Substituir ou excluir uma foto, excluir uma oferta e excluir a conta também
liberam as imagens geradas por esta integração. A limpeza consulta referências
em `offerPhotos` e `users.profilePicture` para preservar URLs ainda em uso. URLs
externas ou de outra conta Cloudinary são preservadas. O pedido de exclusão
invalida as cópias no CDN.

Falhas de limpeza são registradas com mensagem genérica e não desfazem uma
alteração já confirmada. Não há fila de retentativas; se o provedor estiver
indisponível durante a limpeza, podem restar imagens órfãs no Cloudinary.

Validação sem banco e arquivos reais: `npm.cmd run test:offer-editor`.

## CRUD por foto

CRUD da tabela `offerPhotos`, seguindo o fluxo de rotas Express, controller,
DTOs, casos de uso, interface de DAO e persistência PostgreSQL do backend.

Todas as rotas exigem `Authorization: Bearer <accessToken>` de usuário.
Somente o dono da oferta pode cadastrar, atualizar ou excluir suas fotos.
Qualquer usuário autenticado pode consultar as fotos de uma oferta, seguindo
a regra anterior de consulta, exceto fotos de rascunhos, restritas ao dono.

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

Exclui o registro da foto indicada. A oferta e as demais fotos são preservadas.
Imagens geradas por esta integração são liberadas se a URL não tiver mais
referências no banco; imagens externas e arquivos locais são preservados.
Uma nova tentativa de excluir a mesma foto retorna `404`.

### Exclusão da oferta ou do usuário

`DELETE /offer/:id` permite ao dono excluir a oferta e remove automaticamente
todas as suas fotos. Ao excluir o usuário (`DELETE /users/me`), o banco remove
suas ofertas e todas as respectivas fotos. As duas cascatas também valem para
exclusões SQL diretas, preservando os dados de outros usuários. Elas excluem
os registros em `offerPhotos`. Quando a exclusão acontece pela API, as URLs são
capturadas antes da cascata para a limpeza das imagens sem uso no Cloudinary.
Exclusões SQL diretas não executam essa limpeza.

## Erros e persistência

- `400`: ID vazio ou maior que 36 caracteres, corpo ou campos inválidos.
- `401`: token ausente, inválido, expirado ou token de refresh.
- `403`: tentativa de cadastrar, atualizar ou excluir foto de oferta de outro usuário.
- `404`: oferta ou foto não encontrada.
- `409`: a escrita deixou de corresponder à foto, à oferta ou ao dono validado
  na leitura; recarregue os dados antes de tentar novamente.
- `500`: falha inesperada, com mensagem genérica sem detalhes do banco.
- `503`: falha de configuração ou envio ao Cloudinary nas rotas de upload.

Os erros de negócio usam `ApplicationError.code`, incluindo
`OFFER_PHOTO_NOT_FOUND` (`404`) e `OFFER_PHOTO_WRITE_CONFLICT` (`409`).
Todas as consultas usam parâmetros. A criação verifica o dono em
`INSERT ... SELECT`; a atualização e a exclusão também verificam oferta e dono
na própria escrita SQL, protegendo a autorização entre leitura e gravação.

O schema PostgreSQL atual já contempla os campos de fotos, `description` com
padrão `""`, `users.profilePicture` e as cascatas de exclusão. A integração
Cloudinary não exige novas colunas. O banco precisa ter a migration inicial
`20261115120000-initialize-postgres.js` aplicada. Para aplicá-la, execute
`npm.cmd run db:migrate` a partir de `Backend` no ambiente desejado.

## Validação automatizada

Execute em `Backend`:

```powershell
npm.cmd run build
npm.cmd run test:cloudinary
```

Os testes exercitam o app Express real, autenticação JWT, DTOs, casos de uso e
DAOs com consultas PostgreSQL e SDK Cloudinary simulados. Cobrem uploads por
stream, URLs HTTPS, autenticação, permissões, limites, limpeza após o commit,
rollback de uploads paralelos, preservação de imagens compartilhadas e falhas
do provedor. Não acessam o banco nem a conta Cloudinary reais.

Para validar o banco real em um schema temporário isolado, execute
`$env:POSTGRES_INTEGRATION='1'; npm.cmd run test:postgres`. Esse teste aplica e
reverte a migration no schema de teste, que é removido ao final; não envia
imagens ao Cloudinary.

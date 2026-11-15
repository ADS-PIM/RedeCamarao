import { CreateOfferPhoto } from '../../application/usecase/offerPhoto/CreateOfferPhotoUseCase';
import { UpdateOfferPhoto } from '../../application/usecase/offerPhoto/UpdateOfferPhotoUseCase';
import { SearchOfferPhotosByOfferId } from '../../application/usecase/offerPhoto/SearchOfferPhotosByOfferIdUseCase';
import { DeleteOfferPhoto } from '../../application/usecase/offerPhoto/DeleteOfferPhotoUseCase';
import { OfferDAOPostgres } from '../../infra/bd/postgres/offer.Postgres.dao';
import { OfferPhotoDAOPostgres } from '../../infra/bd/postgres/offerPhoto.Postgres.dao';
import { OfferPhotoController } from '../../infra/web/express/controllers/offerPhoto.controller';

const offerPhotoDAO = new OfferPhotoDAOPostgres();
const offerDAO = new OfferDAOPostgres();

export const offerPhotoController = new OfferPhotoController(
    new CreateOfferPhoto(offerPhotoDAO, offerDAO),
    new UpdateOfferPhoto(offerPhotoDAO, offerDAO),
    new SearchOfferPhotosByOfferId(offerPhotoDAO, offerDAO),
    new DeleteOfferPhoto(offerPhotoDAO, offerDAO)
);

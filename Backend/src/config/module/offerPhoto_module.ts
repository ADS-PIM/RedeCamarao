import { CreateOfferPhoto } from '../../application/usecase/offerPhoto/CreateOfferPhotoUseCase';
import { UpdateOfferPhoto } from '../../application/usecase/offerPhoto/UpdateOfferPhotoUseCase';
import { SearchOfferPhotosByOfferId } from '../../application/usecase/offerPhoto/SearchOfferPhotosByOfferIdUseCase';
import { DeleteOfferPhoto } from '../../application/usecase/offerPhoto/DeleteOfferPhotoUseCase';
import { OfferDAOMySQL } from '../../infra/bd/mySql/offer.MySQL.dao';
import { OfferPhotoDAOMySQL } from '../../infra/bd/mySql/offerPhoto.MySQL.dao';
import { OfferPhotoController } from '../../infra/web/express/controllers/offerPhoto.controller';

const offerPhotoDAO = new OfferPhotoDAOMySQL();
const offerDAO = new OfferDAOMySQL();

export const offerPhotoController = new OfferPhotoController(
    new CreateOfferPhoto(offerPhotoDAO, offerDAO),
    new UpdateOfferPhoto(offerPhotoDAO, offerDAO),
    new SearchOfferPhotosByOfferId(offerPhotoDAO, offerDAO),
    new DeleteOfferPhoto(offerPhotoDAO, offerDAO)
);

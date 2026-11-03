import { CreateOffer } from '../../application/usecase/offer/CreateOfferUseCase';
import { OfferDAOMySQL } from '../../infra/bd/mySql/offer.MySQL.dao';
import { UserDAOMySQL } from '../../infra/bd/mySql/user.MySQL.dao';
import { OfferController } from '../../infra/web/express/controllers/offer.controller';

const offerDAO = new OfferDAOMySQL();
const userDAO = new UserDAOMySQL();

const createOffer = new CreateOffer(offerDAO, userDAO);

export const offerController = new OfferController(createOffer);

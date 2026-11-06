import { CreateOffer } from '../../application/usecase/offer/CreateOfferUseCase';
import { ListOffersByUserId } from '../../application/usecase/offer/ListOffersByUserIdUseCase';
import { UpdateOffer } from '../../application/usecase/offer/UpdateOfferUseCase';
import { SearchOffer } from '../../application/usecase/offer/SearchOfferUseCase';
import { OfferDAOMySQL } from '../../infra/bd/mySql/offer.MySQL.dao';
import { UserDAOMySQL } from '../../infra/bd/mySql/user.MySQL.dao';
import { OfferController } from '../../infra/web/express/controllers/offer.controller';

const offerDAO = new OfferDAOMySQL();
const userDAO = new UserDAOMySQL();

const createOffer = new CreateOffer(offerDAO, userDAO);

const listOffersByUserId = new ListOffersByUserId(offerDAO, userDAO);

const updateOffer = new UpdateOffer(offerDAO);

const searchOffer = new SearchOffer(offerDAO);

export const offerController = new OfferController(createOffer, listOffersByUserId, updateOffer, searchOffer);

import { CreateOffer } from '../../application/usecase/offer/CreateOfferUseCase';
import { ListOffersByUserId } from '../../application/usecase/offer/ListOffersByUserIdUseCase';
import { UpdateOffer } from '../../application/usecase/offer/UpdateOfferUseCase';
import { SearchOffer } from '../../application/usecase/offer/SearchOfferUseCase';
import { DeleteOffer } from '../../application/usecase/offer/DeleteOfferUseCase';
import { SearchPublicOfferById } from '../../application/usecase/offer/SearchPublicOfferByIdUseCase';
import { OfferDAOPostgres } from '../../infra/bd/postgres/offer.Postgres.dao';
import { UserDAOPostgres } from '../../infra/bd/postgres/user.Postgres.dao';
import { OfferPhotoDAOPostgres } from '../../infra/bd/postgres/offerPhoto.Postgres.dao';
import { OfferController } from '../../infra/web/express/controllers/offer.controller';

const offerDAO = new OfferDAOPostgres();
const userDAO = new UserDAOPostgres();

const createOffer = new CreateOffer(offerDAO, userDAO);

const listOffersByUserId = new ListOffersByUserId(offerDAO, userDAO);

const updateOffer = new UpdateOffer(offerDAO);

const searchOffer = new SearchOffer(offerDAO);

const deleteOffer = new DeleteOffer(offerDAO);
const searchPublicOfferById = new SearchPublicOfferById(offerDAO, userDAO, new OfferPhotoDAOPostgres());

export const offerController = new OfferController(createOffer, listOffersByUserId, updateOffer, searchOffer, deleteOffer, searchPublicOfferById);

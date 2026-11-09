import { UserController } from '../../infra/web/express/controllers/user.controller';
import { PublicProducerController } from '../../infra/web/express/controllers/publicProducer.controller';
import { OfferDAOMySQL } from '../../infra/bd/mySql/offer.MySQL.dao';
import { SearchPublicProducers } from '../../application/usecase/user/SearchPublicProducersUseCase';
import { SearchPublicProducerById } from '../../application/usecase/user/SearchPublicProducerByIdUseCase';

import { UserDAOMySQL } from '../../infra/bd/mySql/user.MySQL.dao';

import { UserRefreshTokenDAOMySQL } from '../../infra/bd/mySql/UserRefreshToken.MySQL.dao';


import { CreateUser } from '../../application/usecase/user/CreateUserCase';
import { SearchByEmailUser } from '../../application/usecase/user/SearchUserByEmailUseCase';
import { SearchByIdUser } from '../../application/usecase/user/SearchUserByIdUseCase';
import { UpdateUser } from '../../application/usecase/user/UpdateUserUseCase';
import { DeleteUser } from '../../application/usecase/user/DeleteUserUseCase'

import { CreateRefreshToken } from '../../application/usecase/refresh_token/CreateRefreshTokenUseCase';
import { ConsumeRefreshToken } from '../../application/usecase/refresh_token/ConsumeRefreshTokenUseCase';
import { DeleteByToken } from '../../application/usecase/refresh_token/DeleteByTokenUseCase';
import { DeleteByUserId } from '../../application/usecase/refresh_token/DeleteByUserIdUseCase';



const userDAO = new UserDAOMySQL();

export const publicProducerController = new PublicProducerController(
    new SearchPublicProducers(userDAO),
    new SearchPublicProducerById(userDAO, new OfferDAOMySQL())
);

const userRefreshTokenDAO = new UserRefreshTokenDAOMySQL();



const createUser = new CreateUser(userDAO);
const searchByEmailUser = new SearchByEmailUser(userDAO);
const searchByIdUser = new SearchByIdUser(userDAO);
const updateUser = new UpdateUser(userDAO);
const deleteUser = new DeleteUser(userDAO)


const createRefreshToken = new CreateRefreshToken(
    userRefreshTokenDAO
);

const consumeRefreshToken = new ConsumeRefreshToken(
    userRefreshTokenDAO
);

const deleteByToken = new DeleteByToken(
    userRefreshTokenDAO
);

const deleteByUserId = new DeleteByUserId(
    userRefreshTokenDAO
);



export const userController = new UserController(
    createUser,
    searchByEmailUser,
    searchByIdUser,
    updateUser,
    deleteUser,
    createRefreshToken,
    consumeRefreshToken,
    deleteByToken,
    deleteByUserId
);

import { UserController } from '../../infra/web/express/controllers/user.controller';

import { UserDAOMySQL } from '../../infra/bd/mySql/user.MySQL.dao';

import { UserRefreshTokenDAOMySQL } from '../../infra/bd/mySql/UserRefreshToken.MySQL.dao';


import { CreateUser } from '../../application/usecase/user/CreateUserCase';
import { SearchByEmailUser } from '../../application/usecase/user/SearchUserByEmailUseCase';
import { SearchByIdUser } from '../../application/usecase/user/SearchUserByIdUseCase';
import { UpdateUser } from '../../application/usecase/user/UpdateUserUseCase';


import { CreateUserRefreshToken } from '../../application/usecase/user_refresh_token/CreateUserRefreshtokenUseCase';
import { ConsumeUserRefreshToken } from '../../application/usecase/user_refresh_token/ConsumeUserRefreshTokenUseCase';
import { RevokeUserRefreshToken } from '../../application/usecase/user_refresh_token/RevokeUserRefreshTokenUseCase';
import { RevokeAllUserRefreshTokens } from '../../application/usecase/user_refresh_token/RevokeAllUserRefreshTokensUseCase';



const userDAO = new UserDAOMySQL();

const userRefreshTokenDAO = new UserRefreshTokenDAOMySQL();



const createUser = new CreateUser(userDAO);

const searchByEmailUser = new SearchByEmailUser(userDAO);

const searchByIdUser = new SearchByIdUser(userDAO);

const updateUser = new UpdateUser(userDAO);



const createUserRefreshToken = new CreateUserRefreshToken(
    userRefreshTokenDAO
);

const consumeUserRefreshToken = new ConsumeUserRefreshToken(
    userRefreshTokenDAO
);

const revokeUserRefreshToken = new RevokeUserRefreshToken(
    userRefreshTokenDAO
);

const revokeAllUserRefreshTokens = new RevokeAllUserRefreshTokens(
    userRefreshTokenDAO
);



export const userController = new UserController(
    createUser,
    searchByEmailUser,
    searchByIdUser,
    updateUser,
    createUserRefreshToken,
    consumeUserRefreshToken,
    revokeUserRefreshToken,
    revokeAllUserRefreshTokens
);
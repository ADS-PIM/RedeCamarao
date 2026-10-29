import { PasswordResetController } from '../../infra/web/express/controllers/passwordReset.controller';
import { PasswordResetService } from '../../service/passwordReset.service';
import { AdminController } from "../../infra/web/express/controllers/admin.controller";
// 
import { AdminDAOMySQL } from "../../infra/bd/mySql/admin.MySQL.dao";
import { PasswordResetDAOMySQL } from '../../infra/bd/mySql/passwordReset.MySQL.dao';
import { RefreshTokenDAOMySQL } from "../../infra/bd/mySql/refreshToken.MySQL.dao";

import { CreateRefreshToken } from "../../application/usecase/refresh_token/CreateRefreshTokenUseCase";
import { DeleteByToken } from "../../application/usecase/refresh_token/DeleteByTokenUseCase";
import { FindByToken } from "../../application/usecase/refresh_token/FindByTokenUseCase";
import { SearchByEmailAdmin } from '../../application/usecase/admin/SearchAdminByEmailUseCase';
import { SearchByIdAdmin } from '../../application/usecase/admin/SearchAdminByIdUseCase';
import { UpdateAdmin } from '../../application/usecase/admin/UpdateAdminUseCase';
import { DeleteAdmin } from '../../application/usecase/admin/DeleteAdminUseCase';
import { SearchAllAdmins } from '../../application/usecase/admin/SearchAllAdmins';
import { SearchPublicById } from '../../application/usecase/admin/PublicSearchAdminById';
import { CreateAdmin } from '../../application/usecase/admin/CreateAdminUseCase';

const adminDAO = new AdminDAOMySQL();
const refreshTokenDAO = new RefreshTokenDAOMySQL();
const passwordResetDAO = new PasswordResetDAOMySQL();

const createAdmin = new CreateAdmin(adminDAO);
const searchByEmailAdmin = new SearchByEmailAdmin(adminDAO);
const searchByIdAdmin = new SearchByIdAdmin(adminDAO);
const updateAdmin = new UpdateAdmin(adminDAO);
const deleteAdmin = new DeleteAdmin(adminDAO);
const searchAllAdmins = new SearchAllAdmins(adminDAO);
const searchPublicById = new SearchPublicById(adminDAO);

const createRefreshToken = new CreateRefreshToken(refreshTokenDAO);
const findByToken = new FindByToken(refreshTokenDAO);
const deleteByToken = new DeleteByToken(refreshTokenDAO);

export const adminController = new AdminController(
    createAdmin,
    searchByEmailAdmin,
    searchByIdAdmin,
    searchPublicById,
    createRefreshToken,
    findByToken,
    deleteByToken,
    updateAdmin,
    deleteAdmin,
    searchAllAdmins
);
const passwordResetService = new PasswordResetService(passwordResetDAO);
export const passwordResetController = new PasswordResetController(passwordResetService);

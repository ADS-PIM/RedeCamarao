import { PasswordResetController } from '../../infra/web/express/controllers/passwordReset.controller';
import { PasswordResetService } from '../../service/passwordReset.service';
import { AdminController } from "../../infra/web/express/controllers/admin.controller";
// 
import { AdminDAOPostgres } from "../../infra/bd/postgres/admin.Postgres.dao";
import { PasswordResetDAOPostgres } from '../../infra/bd/postgres/passwordReset.Postgres.dao';
import { RefreshTokenDAOPostgres } from "../../infra/bd/postgres/adminRefreshToken.Postgres.dao";

import { CreateRefreshToken } from "../../application/usecase/refresh_token/CreateRefreshTokenUseCase";
import { DeleteByToken } from "../../application/usecase/refresh_token/DeleteByTokenUseCase";
import { SearchByEmailAdmin } from '../../application/usecase/admin/SearchAdminByEmailUseCase';
import { SearchByIdAdmin } from '../../application/usecase/admin/SearchAdminByIdUseCase';
import { UpdateAdmin } from '../../application/usecase/admin/UpdateAdminUseCase';
import { DeleteAdmin } from '../../application/usecase/admin/DeleteAdminUseCase';
import { SearchAllAdmins } from '../../application/usecase/admin/SearchAllAdmins';
import { SearchPublicById } from '../../application/usecase/admin/PublicSearchAdminById';
import { CreateAdmin } from '../../application/usecase/admin/CreateAdminUseCase';

const adminDAO = new AdminDAOPostgres();
const refreshTokenDAO = new RefreshTokenDAOPostgres();
const passwordResetDAO = new PasswordResetDAOPostgres();

const createAdmin = new CreateAdmin(adminDAO);
const searchByEmailAdmin = new SearchByEmailAdmin(adminDAO);
const searchByIdAdmin = new SearchByIdAdmin(adminDAO);
const updateAdmin = new UpdateAdmin(adminDAO);
const deleteAdmin = new DeleteAdmin(adminDAO);
const searchAllAdmins = new SearchAllAdmins(adminDAO);
const searchPublicById = new SearchPublicById(adminDAO);

const createRefreshToken = new CreateRefreshToken(refreshTokenDAO);
const deleteByToken = new DeleteByToken(refreshTokenDAO);

export const adminController = new AdminController(
    createAdmin,
    searchByEmailAdmin,
    searchByIdAdmin,
    searchPublicById,
    createRefreshToken,
    rotation => refreshTokenDAO.rotate(rotation),
    deleteByToken,
    updateAdmin,
    deleteAdmin,
    searchAllAdmins
);
const passwordResetService = new PasswordResetService(passwordResetDAO);
export const passwordResetController = new PasswordResetController(passwordResetService);

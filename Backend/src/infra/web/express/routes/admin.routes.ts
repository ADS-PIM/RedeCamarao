import { expressControllerAdapter } from '../adapters/expressControllerAdapter';
import { Router } from "express";
import { AdminController } from "../../../../presentation/controllers/admin.controller";
import { CreateAdmin, DeleteAdmin, SearchAllAdmins, SearchByEmailAdmin, SearchByIdAdmin, SearchPublicById, UpdateAdmin } from "../../../../application/usecase/AdminUseCases";
import { AdminDAOMySQL } from "../../../bd/mySql/admin.MySQL.dao";
import authToken, { isSuperAdmin } from "../../../../../authMiddleware";
import { authenticatedRateLimit, loginRateLimit, passwordRateLimit, passwordRecoveryRateLimit, passwordResetRateLimit, sessionRateLimit } from '../../../../rateLimit/middleware';
import { PasswordResetController } from '../../../../presentation/controllers/passwordReset.controller';
import { PasswordResetService } from '../../../../service/passwordReset.service';
import { PasswordResetDAOMySQL } from '../../../bd/mySql/passwordReset.MySQL.dao';
import { RefreshTokenDAOMySQL } from "../../../bd/mySql/refreshToken.MySQL.dao";
import { CreateRefreshToken, DeleteByToken, FindByToken } from "../../../../application/usecase/RefreshTokenCases";

const adminRoutes = Router();
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

const adminController = new AdminController(
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
const passwordResetController = new PasswordResetController(passwordResetService);

adminRoutes
    .post('/forgot-password', ...passwordRecoveryRateLimit, expressControllerAdapter(passwordResetController.request.bind(passwordResetController)));

adminRoutes
    .post('/reset-password', passwordResetRateLimit, expressControllerAdapter(passwordResetController.reset.bind(passwordResetController)));

adminRoutes
    .route('/')
    .get(authToken, authenticatedRateLimit, expressControllerAdapter(adminController.searchAll.bind(adminController)))

adminRoutes
    .route('/register')
    .post(authToken, authenticatedRateLimit, isSuperAdmin, expressControllerAdapter(adminController.register.bind(adminController)))

//Rota usada para cadastrar o Root. Mantida desativada por permitir cadastro sem autenticação.
adminRoutes
    .route('/register/force')
    .post(expressControllerAdapter(adminController.register.bind(adminController)))

adminRoutes
    .route('/login')
    .post(...loginRateLimit, expressControllerAdapter(adminController.login.bind(adminController)))

adminRoutes
    .route('/logout')
    .post(sessionRateLimit, expressControllerAdapter(adminController.logout.bind(adminController)))

adminRoutes
    .route('/refresh')
    .post(sessionRateLimit, expressControllerAdapter(adminController.refresh.bind(adminController)))

adminRoutes
    .route('/:id')
    .get(authToken, authenticatedRateLimit, expressControllerAdapter(adminController.searchById.bind(adminController)))
    .patch(authToken, authenticatedRateLimit, passwordRateLimit, expressControllerAdapter(adminController.update.bind(adminController)))
    .delete(authToken, authenticatedRateLimit, isSuperAdmin, expressControllerAdapter(adminController.delete.bind(adminController)))

export default adminRoutes;
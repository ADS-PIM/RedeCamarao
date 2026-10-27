import { Router } from "express";
import { AdminController } from "../controller/admin.controller";
import { CreateAdmin, DeleteAdmin, SearchAllAdmins, SearchByEmailAdmin, SearchByIdAdmin, SearchPublicById, UpdateAdmin } from "../usecase/AdminUseCases";
import { AdminDAOMySQL } from "../dao/admin.MySQL.dao";
import authToken, { isSuperAdmin } from "../../authMiddleware";
import { authenticatedRateLimit, loginRateLimit, passwordRateLimit, passwordRecoveryRateLimit, passwordResetRateLimit, sessionRateLimit } from '../rateLimit/middleware';
import { PasswordResetController } from '../controller/passwordReset.controller';
import { PasswordResetService } from '../service/passwordReset.service';
import { PasswordResetDAOMySQL } from '../dao/passwordReset.MySQL.dao';
import { RefreshTokenDAOMySQL } from "../dao/refreshToken.MySQL.dao";
import { CreateRefreshToken, DeleteByToken, FindByToken } from "../usecase/RefreshTokenCases";

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
    .post('/forgot-password', ...passwordRecoveryRateLimit, (req, res) => passwordResetController.request(req, res));

adminRoutes
    .post('/reset-password', passwordResetRateLimit, (req, res) => passwordResetController.reset(req, res));

adminRoutes
    .route('/')
    .get(authToken, authenticatedRateLimit, async (req, res) => adminController.searchAll(req, res))

adminRoutes
    .route('/register')
    .post(authToken, authenticatedRateLimit, isSuperAdmin, async (req, res) => adminController.register(req,res))

//Rota usada para cadastrar o Root. Mantida desativada por permitir cadastro sem autenticação.
adminRoutes
    .route('/register/force')
    .post(async (req, res) => adminController.register(req,res))

adminRoutes
    .route('/login')
    .post(...loginRateLimit, async (req, res) => adminController.login(req,res))

adminRoutes
    .route('/logout')
    .post(sessionRateLimit, async (req, res) => adminController.logout(req,res))

adminRoutes
    .route('/refresh')
    .post(sessionRateLimit, async (req, res) => adminController.refresh(req,res))

adminRoutes
    .route('/:id')
    .get(authToken, authenticatedRateLimit, async (req, res) => adminController.searchById(req, res))
    .patch(authToken, authenticatedRateLimit, passwordRateLimit, async (req, res) => adminController.update(req, res))
    .delete(authToken, authenticatedRateLimit, isSuperAdmin, async (req, res) => adminController.delete(req, res))

export default adminRoutes;
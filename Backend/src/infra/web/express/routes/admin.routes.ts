import { Router } from 'express';
import { controllers } from '../../../../config/composition_root';
import authToken, { isSuperAdmin } from '../../../../../authMiddleware';
import {
    authenticatedRateLimit,
    loginRateLimit,
    passwordRateLimit,
    passwordRecoveryRateLimit,
    passwordResetRateLimit,
    sessionRateLimit,
} from '../../../../rateLimit/middleware';

const router = Router();

router.post('/forgot-password', ...passwordRecoveryRateLimit, (req, res) => controllers.passwordResetController.request(req, res));

router.post('/reset-password', passwordResetRateLimit, (req, res) => controllers.passwordResetController.reset(req, res));

router.get('/', authToken, authenticatedRateLimit, (req, res) => controllers.adminController.searchAll(req, res));
router.post('/register', authToken, authenticatedRateLimit, isSuperAdmin, (req, res) => controllers.adminController.register(req, res));

//Rota usada para cadastrar o Root. Mantida desativada por permitir cadastro sem autenticação.
// router.post('/register/force', (req, res) => controllers.adminController.register(req, res));

router.post('/login', ...loginRateLimit, (req, res) => controllers.adminController.login(req, res));
router.post('/logout', sessionRateLimit, (req, res) => controllers.adminController.logout(req, res));
router.post('/refresh', sessionRateLimit, (req, res) => controllers.adminController.refresh(req, res));

router
    .route('/:id')
    .get(authToken, authenticatedRateLimit, (req, res) => controllers.adminController.searchById(req, res))
    .patch(authToken, authenticatedRateLimit, passwordRateLimit, (req, res) => controllers.adminController.update(req, res))
    .delete(authToken, authenticatedRateLimit, isSuperAdmin, (req, res) => controllers.adminController.delete(req, res));

export default router;

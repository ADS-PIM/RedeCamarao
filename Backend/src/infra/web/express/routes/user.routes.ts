import { Router } from 'express';

import { controllers } from '../../../../config/composition_root';
import { authUser } from '../../../../../userAuthMiddleware'

import {
    registrationRateLimit,
    loginRateLimit
} from '../../../../rateLimit/middleware';

const router = Router();

router.post('/register', ...registrationRateLimit, (req, res) => controllers.userController.register(req, res));

router.post('/login', ...loginRateLimit, (req, res) => controllers.userController.login(req, res));

router.post('/refresh', (req, res) => controllers.userController.refresh(req, res));

router.post('/logout', (req, res) => controllers.userController.logout(req, res));

router
    .route('/me')
    .patch(authUser, (req, res) => controllers.userController.update(req, res))
    .delete(authUser, (req, res) => controllers.userController.delete(req, res));


//Consulta informações públicas do usuário
router.get('/public/:id', (req, res) => controllers.userController.searchPublicById(req, res));
//Consultar a própria conta
router.get('/me', authUser, (req, res) => controllers.userController.searchById(req, res));

export default router;

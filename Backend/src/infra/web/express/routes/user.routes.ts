import { Router } from 'express';

import { controllers } from '../../../../config/composition_root';
import { authUser } from '../../../../../userAuthMiddleware'

import {
    registrationRateLimit,
    loginRateLimit
} from '../../../../rateLimit/middleware';

const router = Router();

router.post(
    '/register', ...registrationRateLimit, (req, res) => controllers.userController.register(req, res)
);

router.post(
    '/login', ...loginRateLimit, (req, res) => controllers.userController.login(req, res)
);

router.post(
    '/refresh', (req, res) => controllers.userController.refresh(req, res)
);

router.post(
    '/logout', (req, res) => controllers.userController.logout(req, res)
);

router.get(
    '/me', authUser, (req, res) => controllers.userController.searchById(req, res)
);

router.patch(
    '/me', authUser, (req, res) => controllers.userController.update(req, res)
);

export default router;
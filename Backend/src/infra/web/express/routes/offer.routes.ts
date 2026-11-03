import { Router } from 'express';
import { controllers } from '../../../../config/composition_root';
import { authUser } from '../../../../../userAuthMiddleware';

const router = Router();

router.post('/create', authUser, (req, res) => controllers.offerController.create(req, res));

export default router;

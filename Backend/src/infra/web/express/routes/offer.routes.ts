import { Router } from 'express';
import { controllers } from '../../../../config/composition_root';
import { authUser } from '../../../../../userAuthMiddleware';

const router = Router();

router.post('/create', authUser, (req, res) => controllers.offerController.create(req, res));
router.get('/marketplace', (req, res) => controllers.offerController.searchPublic(req, res));
router.get('/marketplace/:id', (req, res) => controllers.offerController.searchPublicById(req, res));
router.get('/search', authUser, (req, res) => controllers.offerController.search(req, res));
router.get('/user/:userId', authUser, (req, res) => controllers.offerController.listByUserId(req, res));
router.patch('/:id', authUser, (req, res) => controllers.offerController.update(req, res));
router.delete('/:id', authUser, (req, res) => controllers.offerController.delete(req, res));

export default router;

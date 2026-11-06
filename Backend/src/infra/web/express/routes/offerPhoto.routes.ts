import { Router } from 'express';
import { controllers } from '../../../../config/composition_root';
import { authUser } from '../../../../../userAuthMiddleware';

const router = Router();

router.post('/create', authUser, (req, res) => controllers.offerPhotoController.create(req, res));
router.get('/offer/:offerId', authUser, (req, res) => controllers.offerPhotoController.searchByOfferId(req, res));
router.patch('/:id', authUser, (req, res) => controllers.offerPhotoController.update(req, res));
router.delete('/:id', authUser, (req, res) => controllers.offerPhotoController.delete(req, res));

export default router;

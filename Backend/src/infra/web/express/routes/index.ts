import { Router } from 'express';
import adminRoutes from './admin.routes';
import userRoutes from './user.routes'
import offerRoutes from './offer.routes';
import offerPhotoRoutes from './offerPhoto.routes';

const routes = Router();

routes.use('/admin', adminRoutes);

routes.use('/users', userRoutes)

routes.use('/offer', offerRoutes);

routes.use('/offerPhotos', offerPhotoRoutes);

export default routes;

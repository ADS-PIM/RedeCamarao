import { Router } from 'express';
import adminRoutes from './admin.routes';
import userRoutes from './user.routes'
import offerRoutes from './offer.routes';

const routes = Router();

routes.use('/admin', adminRoutes);

routes.use('/users', userRoutes)

routes.use('/offer', offerRoutes);

export default routes;

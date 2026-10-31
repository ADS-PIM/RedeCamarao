import { Router } from 'express';
import adminRoutes from './admin.routes';
import userRoutes from './user.routes'

const routes = Router();

routes.use('/admin', adminRoutes);

routes.use('/users', userRoutes)

export default routes;
import { Router } from 'express';
import { controllers } from '../../../../config/composition_root';

const router = Router();

router.post('/register', (req, res) => controllers.userController.register(req, res));
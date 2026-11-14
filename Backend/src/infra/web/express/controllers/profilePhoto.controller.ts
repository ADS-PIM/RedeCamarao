import type { Response } from 'express';
import type { UserAuthRequest } from '../../../../../userAuthMiddleware';
import { ProfilePhotoDAOMySQL } from '../../../bd/mySql/profilePhoto.MySQL.dao';
import { applicationErrorResponse } from '../applicationErrorResponse';

export async function saveProfilePhoto(req: UserAuthRequest, res: Response) {
    try {
        if (!req.user?.userId) return res.status(401).json({ error: 'Não autorizado' });
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'data') || !(body.data === null || typeof body.data === 'string')) {
            return res.status(400).json({ error: 'Envie uma foto JPG/PNG válida ou remova a foto atual.' });
        }
        const origin = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
        const profilePicture = await new ProfilePhotoDAOMySQL().save(req.user.userId, body.data, origin);
        return res.status(200).json({ profilePicture });
    } catch (error) {
        const response = applicationErrorResponse(error, res);
        if (response) return response;
        console.error('Erro ao salvar foto de perfil:', error);
        return res.status(500).json({ error: 'Não foi possível salvar a foto de perfil.' });
    }
}

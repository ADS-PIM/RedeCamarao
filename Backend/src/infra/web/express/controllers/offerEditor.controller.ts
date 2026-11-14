import type { Response } from 'express';
import type { UserAuthRequest } from '../../../../../userAuthMiddleware';
import { parseOfferEditor } from '../../../../application/dto/offerDTO/OfferEditorDTO';
import { OfferEditorDAOMySQL } from '../../../bd/mySql/offerEditor.MySQL.dao';
import { applicationErrorResponse } from '../applicationErrorResponse';

export async function saveOfferEditor(req: UserAuthRequest, res: Response) {
    try {
        const id = req.params.id;
        if (typeof id !== 'string' || !/^[a-z0-9_-]{1,36}$/i.test(id)) return res.status(400).json({ error: 'ID inválido' });
        if (!req.user?.userId) return res.status(401).json({ error: 'Não autorizado' });
        const { offer, photos } = parseOfferEditor(req.body);
        const origin = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
        const savedPhotos = await new OfferEditorDAOMySQL().save(id, req.user.userId, offer, photos, origin);
        return res.status(200).json({ message: 'Oferta e fotos salvas com sucesso', photos: savedPhotos });
    } catch (error) {
        const response = applicationErrorResponse(error, res);
        if (response) return response;
        console.error('Erro ao salvar edição da oferta:', error);
        return res.status(500).json({ error: 'Não foi possível salvar a oferta. Tente novamente.' });
    }
}

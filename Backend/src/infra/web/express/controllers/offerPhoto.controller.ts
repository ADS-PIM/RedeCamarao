import type { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { UserAuthRequest } from '../../../../../userAuthMiddleware';
import { OfferPhotoCreateDTO } from '../../../../application/dto/offerPhotoDTO/OfferPhotoCreateDTO';
import { OfferPhotoUpdateDTO } from '../../../../application/dto/offerPhotoDTO/OfferPhotoUpdateDTO';
import { CreateOfferPhoto } from '../../../../application/usecase/offerPhoto/CreateOfferPhotoUseCase';
import { UpdateOfferPhoto } from '../../../../application/usecase/offerPhoto/UpdateOfferPhotoUseCase';
import { SearchOfferPhotosByOfferId } from '../../../../application/usecase/offerPhoto/SearchOfferPhotosByOfferIdUseCase';
import { DeleteOfferPhoto } from '../../../../application/usecase/offerPhoto/DeleteOfferPhotoUseCase';
import { applicationErrorResponse } from '../applicationErrorResponse';

const validId = (id: unknown): id is string => typeof id === 'string' && !!id.trim() && id.length <= 36;
const validBody = (body: unknown): body is Record<string, unknown> =>
    !!body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length > 0;

export class OfferPhotoController {
    constructor(
        private readonly createOfferPhoto: CreateOfferPhoto,
        private readonly updateOfferPhoto: UpdateOfferPhoto,
        private readonly searchOfferPhotosByOfferId: SearchOfferPhotosByOfferId,
        private readonly deleteOfferPhoto: DeleteOfferPhoto
    ) {}

    public async create(req: UserAuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Não autorizado' });
            if (!validBody(req.body)) return res.status(400).json({ error: 'Dados da foto inválidos' });

            const data = plainToInstance(OfferPhotoCreateDTO, req.body);
            const errors = await validate(data, { whitelist: true, forbidNonWhitelisted: true });
            if (errors.length > 0) return res.status(400).json({ errors });

            const photo = await this.createOfferPhoto.execute({ userId, data });
            return res.status(201).json({ message: 'Foto da oferta cadastrada com sucesso', photo });
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            console.error('Erro ao cadastrar foto da oferta:', error);
            return res.status(500).json({ error: 'Erro ao cadastrar foto da oferta' });
        }
    }

    public async update(req: UserAuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Não autorizado' });
            const id = req.params.id;
            if (!validId(id)) return res.status(400).json({ error: 'ID da foto inválido' });
            if (!validBody(req.body)) return res.status(400).json({ error: 'Dados da foto inválidos' });

            const data = plainToInstance(OfferPhotoUpdateDTO, req.body);
            const errors = await validate(data, { whitelist: true, forbidNonWhitelisted: true });
            if (errors.length > 0) return res.status(400).json({ errors });

            await this.updateOfferPhoto.execute({ id, userId, data });
            return res.status(200).json({ message: 'Foto da oferta atualizada com sucesso' });
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            console.error('Erro ao atualizar foto da oferta:', error);
            return res.status(500).json({ error: 'Erro ao atualizar foto da oferta' });
        }
    }

    public async searchByOfferId(req: UserAuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.user?.userId) return res.status(401).json({ error: 'Não autorizado' });
            const offerId = req.params.offerId;
            if (!validId(offerId)) return res.status(400).json({ error: 'ID da oferta inválido' });

            const photos = await this.searchOfferPhotosByOfferId.execute(offerId, req.user.userId);
            return res.status(200).json(photos);
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            console.error('Erro ao buscar fotos da oferta:', error);
            return res.status(500).json({ error: 'Erro ao buscar fotos da oferta' });
        }
    }

    public async delete(req: UserAuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Não autorizado' });
            const id = req.params.id;
            if (!validId(id)) return res.status(400).json({ error: 'ID da foto inválido' });

            await this.deleteOfferPhoto.execute({ id, userId });
            return res.status(200).json({ message: 'Foto da oferta excluída com sucesso' });
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            console.error('Erro ao excluir foto da oferta:', error);
            return res.status(500).json({ error: 'Erro ao excluir foto da oferta' });
        }
    }
}

import { applicationErrorResponse } from '../applicationErrorResponse';
import type { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { UserAuthRequest } from '../../../../../userAuthMiddleware';
import { OfferCreateDTO } from '../../../../application/dto/offerDTO/OfferCreateDTO';
import { CreateOffer } from '../../../../application/usecase/offer/CreateOfferUseCase';
import { ListOffersByUserId } from '../../../../application/usecase/offer/ListOffersByUserIdUseCase';
import { OfferUpdateDTO } from '../../../../application/dto/offerDTO/OfferUpdateDTO';
import { UpdateOffer } from '../../../../application/usecase/offer/UpdateOfferUseCase';
import { SearchOffer } from '../../../../application/usecase/offer/SearchOfferUseCase';

export class OfferController {
    constructor(
        private readonly createOffer: CreateOffer,
        private readonly listOffersByUserId: ListOffersByUserId,
        private readonly updateOffer: UpdateOffer,
        private readonly searchOffer: SearchOffer
    ) {}

    public async search(req: UserAuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const offers = await this.searchOffer.execute();
            return res.status(200).json(offers);
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            console.error('Error searching offers:', error);
            return res.status(500).json({ error: 'Error searching offers' });
        }
    }

    public async update(req: UserAuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const id = req.params.id;
            if (typeof id !== 'string' || !id.trim() || id.length > 36) {
                return res.status(400).json({ error: 'Invalid offer ID' });
            }
            if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
                return res.status(400).json({ error: 'Invalid offer data' });
            }

            const data = plainToInstance(OfferUpdateDTO, req.body);
            const errors = await validate(data, { whitelist: true, forbidNonWhitelisted: true });
            if (errors.length > 0) return res.status(400).json({ errors });

            await this.updateOffer.execute({ id, userId, data });
            return res.status(200).json({ message: 'Offer updated successfully' });
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            console.error('Error updating offer:', error);
            return res.status(500).json({ error: 'Error updating offer' });
        }
    }

    public async listByUserId(req: UserAuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const userId = req.params.userId;
            if (typeof userId !== 'string' || !userId.trim() || userId.length > 36) {
                return res.status(400).json({ error: 'Invalid user ID' });
            }

            const offers = await this.listOffersByUserId.execute(userId);
            return res.status(200).json(offers);
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            console.error('Error listing offers:', error);
            return res.status(500).json({ error: 'Error listing offers' });
        }
    }

    public async create(req: UserAuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
                return res.status(400).json({ error: 'Invalid offer data' });
            }

            const offerCreateDTO = plainToInstance(OfferCreateDTO, req.body);
            const errors = await validate(offerCreateDTO, {
                whitelist: true,
                forbidNonWhitelisted: true
            });

            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }

            await this.createOffer.execute({ userId, data: offerCreateDTO });

            return res.status(201).json({ message: 'Offer created successfully' });
        } catch (error: any) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            console.error('Error creating offer:', error);
            return res.status(500).json({ error: 'Error creating offer' });
        }
    }
}

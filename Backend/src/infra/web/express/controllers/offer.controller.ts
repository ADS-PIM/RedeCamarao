import type { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { UserAuthRequest } from '../../../../../userAuthMiddleware';
import { OfferCreateDTO } from '../../../../application/dto/offerDTO/OfferCreateDTO';
import { CreateOffer } from '../../../../application/usecase/offer/CreateOfferUseCase';

export class OfferController {
    constructor(private readonly createOffer: CreateOffer) {}

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
            if (error.message === 'User not found' || error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({ error: 'User not found' });
            }

            if (error.message === 'Minimum quantity cannot exceed maximum quantity' ||
                error.message === 'End date cannot precede start date') {
                return res.status(400).json({ error: error.message });
            }

            console.error('Error creating offer:', error);
            return res.status(500).json({ error: 'Error creating offer' });
        }
    }
}

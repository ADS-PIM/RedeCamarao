import type { Request, Response } from 'express';
import type { SearchPublicProducerById } from '../../../../application/usecase/user/SearchPublicProducerByIdUseCase';
import type { SearchPublicProducers } from '../../../../application/usecase/user/SearchPublicProducersUseCase';
import { applicationErrorResponse } from '../applicationErrorResponse';

export class PublicProducerController {
    constructor(
        private readonly searchPublicProducers: SearchPublicProducers,
        private readonly searchPublicProducerById: SearchPublicProducerById
    ) {}

    public async search(_req: Request, res: Response): Promise<Response> {
        try {
            return res.status(200).json(await this.searchPublicProducers.execute());
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;
            console.error('Error searching public producers:', error);
            return res.status(500).json({ error: 'Não foi possível carregar os produtores' });
        }
    }

    public async searchById(req: Request, res: Response): Promise<Response> {
        try {
            const id = req.params.id;
            if (typeof id !== 'string' || !id.trim() || id.length > 36) {
                return res.status(400).json({ error: 'ID do produtor inválido' });
            }
            return res.status(200).json(await this.searchPublicProducerById.execute(id));
        } catch (error: unknown) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;
            console.error('Error searching public producer details:', error);
            return res.status(500).json({ error: 'Não foi possível carregar o produtor' });
        }
    }
}

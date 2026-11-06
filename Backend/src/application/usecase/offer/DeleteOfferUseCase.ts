import { ApplicationError } from '../../errors/ApplicationError';
import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { UseCase } from '../useCase';

type DeleteOfferInput = { id: string; userId: string };

export class DeleteOffer implements UseCase<DeleteOfferInput, void> {
    constructor(private readonly offerDAO: OfferDAOInterface) {}

    public async execute({ id, userId }: DeleteOfferInput): Promise<void> {
        const offer = await this.offerDAO.searchById(id);
        if (!offer) throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
        if (offer.userId !== userId) throw new ApplicationError('FORBIDDEN', 'Acesso negado');

        if (!(await this.offerDAO.delete(id, userId))) {
            throw new ApplicationError('OFFER_DELETE_CONFLICT', 'Oferta alterada durante a exclusão; recarregue e tente novamente');
        }
    }
}

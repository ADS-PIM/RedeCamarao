import { ApplicationError } from '../../errors/ApplicationError';
import { OfferDAOInterface, OfferUpdateData } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { UseCase } from '../useCase';
import { offerDate } from './offerDate';

type UpdateOfferInput = { id: string; userId: string; data: OfferUpdateData };

// MySQL DATE values are read as dates in the connection's local timezone.
const calendarDate = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export class UpdateOffer implements UseCase<UpdateOfferInput, void> {
    constructor(private readonly offerDAO: OfferDAOInterface) {}

    public async execute({ id, userId, data }: UpdateOfferInput): Promise<void> {
        data = {
            ...data,
            ...(data.startDate !== undefined ? { startDate: offerDate(data.startDate) } : {}),
            ...(data.endDate !== undefined ? { endDate: offerDate(data.endDate) } : {})
        };
        const offer = await this.offerDAO.searchById(id);
        if (!offer) throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
        if (offer.userId !== userId) throw new ApplicationError('FORBIDDEN', 'Acesso negado');

        if ((data.minimumQuantity ?? offer.minimumQuantity) > (data.maximumQuantity ?? offer.maximumQuantity)) {
            throw new ApplicationError('INVALID_QUANTITY_RANGE', 'A quantidade mínima não pode exceder a quantidade máxima');
        }
        if ((data.endDate ?? calendarDate(offer.endDate)) < (data.startDate ?? calendarDate(offer.startDate))) {
            throw new ApplicationError('INVALID_DATE_RANGE', 'A data de término não pode preceder a data de início');
        }

        if (!(await this.offerDAO.update(id, userId, data))) {
            throw new ApplicationError('OFFER_UPDATE_CONFLICT', 'Oferta alterada durante a atualização; recarregue e tente novamente');
        }
    }
}

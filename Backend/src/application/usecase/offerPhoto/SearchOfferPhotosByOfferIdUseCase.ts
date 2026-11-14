import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { OfferPhotoDAOInterface } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';
import { OfferPhotoSearchDTO } from '../../dto/offerPhotoDTO/OfferPhotoSearchDTO';
import { ApplicationError } from '../../errors/ApplicationError';
import { UseCase } from '../useCase';
import { OfferStatus } from '../../../domain/model/offer';

export class SearchOfferPhotosByOfferId implements UseCase<string, OfferPhotoSearchDTO[]> {
    constructor(
        private readonly offerPhotoDAO: OfferPhotoDAOInterface,
        private readonly offerDAO: OfferDAOInterface
    ) {}

    public async execute(offerId: string, userId?: string): Promise<OfferPhotoSearchDTO[]> {
        const offer = await this.offerDAO.searchById(offerId);
        if (!offer) {
            throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
        }
        if (offer.status === OfferStatus.DRAFT && offer.userId !== userId) throw new ApplicationError('FORBIDDEN', 'Acesso negado');

        const photos = await this.offerPhotoDAO.searchByOfferId(offerId);
        return photos.map(OfferPhotoSearchDTO.fromModel);
    }
}

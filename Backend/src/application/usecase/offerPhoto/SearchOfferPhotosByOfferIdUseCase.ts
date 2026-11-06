import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { OfferPhotoDAOInterface } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';
import { OfferPhotoSearchDTO } from '../../dto/offerPhotoDTO/OfferPhotoSearchDTO';
import { ApplicationError } from '../../errors/ApplicationError';
import { UseCase } from '../useCase';

export class SearchOfferPhotosByOfferId implements UseCase<string, OfferPhotoSearchDTO[]> {
    constructor(
        private readonly offerPhotoDAO: OfferPhotoDAOInterface,
        private readonly offerDAO: OfferDAOInterface
    ) {}

    public async execute(offerId: string): Promise<OfferPhotoSearchDTO[]> {
        if (!(await this.offerDAO.searchById(offerId))) {
            throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
        }

        const photos = await this.offerPhotoDAO.searchByOfferId(offerId);
        return photos.map(OfferPhotoSearchDTO.fromModel);
    }
}

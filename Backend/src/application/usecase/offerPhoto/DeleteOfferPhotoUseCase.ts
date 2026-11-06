import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { OfferPhotoDAOInterface } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';
import { ApplicationError } from '../../errors/ApplicationError';
import { UseCase } from '../useCase';

type DeleteOfferPhotoInput = { id: string; userId: string };

export class DeleteOfferPhoto implements UseCase<DeleteOfferPhotoInput, void> {
    constructor(
        private readonly offerPhotoDAO: OfferPhotoDAOInterface,
        private readonly offerDAO: OfferDAOInterface
    ) {}

    public async execute({ id, userId }: DeleteOfferPhotoInput): Promise<void> {
        const photo = await this.offerPhotoDAO.searchById(id);
        if (!photo) throw new ApplicationError('OFFER_PHOTO_NOT_FOUND', 'Foto da oferta não encontrada');

        const offer = await this.offerDAO.searchById(photo.offerId);
        if (!offer) throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
        if (offer.userId !== userId) throw new ApplicationError('FORBIDDEN', 'Acesso negado');

        if (!(await this.offerPhotoDAO.delete(id, photo.offerId, userId))) {
            throw new ApplicationError('OFFER_PHOTO_WRITE_CONFLICT', 'Foto ou oferta alterada durante a exclusão; recarregue e tente novamente');
        }
    }
}

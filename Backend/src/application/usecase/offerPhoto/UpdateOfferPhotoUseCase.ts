import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { OfferPhotoDAOInterface, OfferPhotoUpdateData } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';
import { ApplicationError } from '../../errors/ApplicationError';
import { UseCase } from '../useCase';

type UpdateOfferPhotoInput = { id: string; userId: string; data: OfferPhotoUpdateData };

export class UpdateOfferPhoto implements UseCase<UpdateOfferPhotoInput, void> {
    constructor(
        private readonly offerPhotoDAO: OfferPhotoDAOInterface,
        private readonly offerDAO: OfferDAOInterface
    ) {}

    public async execute({ id, userId, data }: UpdateOfferPhotoInput): Promise<void> {
        const photo = await this.offerPhotoDAO.searchById(id);
        if (!photo) throw new ApplicationError('OFFER_PHOTO_NOT_FOUND', 'Foto da oferta não encontrada');

        const offer = await this.offerDAO.searchById(photo.offerId);
        if (!offer) throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
        if (offer.userId !== userId) throw new ApplicationError('FORBIDDEN', 'Acesso negado');

        if (!(await this.offerPhotoDAO.update(id, photo.offerId, userId, data))) {
            throw new ApplicationError('OFFER_PHOTO_WRITE_CONFLICT', 'Foto ou oferta alterada durante a atualização; recarregue e tente novamente');
        }
    }
}

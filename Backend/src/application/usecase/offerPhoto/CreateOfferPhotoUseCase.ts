import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { OfferPhotoDAOInterface } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';
import { OfferPhoto } from '../../../domain/model/offerPhoto';
import { OfferPhotoCreateDTO } from '../../dto/offerPhotoDTO/OfferPhotoCreateDTO';
import { OfferPhotoSearchDTO } from '../../dto/offerPhotoDTO/OfferPhotoSearchDTO';
import { ApplicationError } from '../../errors/ApplicationError';
import { UseCase } from '../useCase';

type CreateOfferPhotoInput = { userId: string; data: OfferPhotoCreateDTO };

export class CreateOfferPhoto implements UseCase<CreateOfferPhotoInput, OfferPhotoSearchDTO> {
    constructor(
        private readonly offerPhotoDAO: OfferPhotoDAOInterface,
        private readonly offerDAO: OfferDAOInterface
    ) {}

    public async execute({ userId, data }: CreateOfferPhotoInput): Promise<OfferPhotoSearchDTO> {
        const offer = await this.offerDAO.searchById(data.offerId);
        if (!offer) throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
        if (offer.userId !== userId) throw new ApplicationError('FORBIDDEN', 'Acesso negado');

        const photo = OfferPhoto.construct(data);
        if (!(await this.offerPhotoDAO.create(photo, userId))) {
            throw new ApplicationError('OFFER_PHOTO_WRITE_CONFLICT', 'Oferta alterada durante o cadastro da foto; recarregue e tente novamente');
        }
        return OfferPhotoSearchDTO.fromModel(photo);
    }
}

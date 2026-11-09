import type { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import type { OfferPhotoDAOInterface } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';
import type { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface';
import { UserType } from '../../../domain/model/user';
import type { PublicOfferDetailDTO } from '../../dto/offerDTO/PublicOfferDetailDTO';
import { ApplicationError } from '../../errors/ApplicationError';
import type { UseCase } from '../useCase';

export class SearchPublicOfferById implements UseCase<string, PublicOfferDetailDTO> {
    constructor(
        private readonly offerDAO: OfferDAOInterface,
        private readonly userDAO: UserDAOInterface,
        private readonly offerPhotoDAO: OfferPhotoDAOInterface
    ) {}

    public async execute(id: string): Promise<PublicOfferDetailDTO> {
        // Reuse the catalog query so status and availability follow the same database calendar.
        const activeOffers = await this.offerDAO.searchActive();
        const offer = activeOffers.find(item => item.id === id);
        if (!offer) throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');

        const producer = await this.userDAO.searchById(offer.userId);
        if (!producer || producer.userType !== UserType.PRODUCER) {
            throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
        }

        const photos = await this.offerPhotoDAO.searchByOfferId(offer.id);
        return {
            id: offer.id,
            title: offer.title,
            description: offer.description,
            type: offer.type,
            size: offer.size,
            price: offer.price,
            weight: offer.weight,
            maximumQuantity: offer.maximumQuantity,
            minimumQuantity: offer.minimumQuantity,
            location: offer.location,
            startDate: offer.startDate,
            endDate: offer.endDate,
            createdAt: offer.createdAt,
            photos: photos.map(photo => ({
                id: photo.id,
                imageUrl: photo.imageUrl,
                description: photo.description
            })),
            // This is the same contact/profile allowlist already exposed by /users/public/:id.
            producer: {
                id: producer.id,
                name: producer.name,
                description: producer.description,
                location: producer.location,
                phone: producer.phone,
                businessHours: producer.businessHours,
                activeOfferCount: activeOffers.filter(item => item.userId === producer.id).length
            }
        };
    }
}

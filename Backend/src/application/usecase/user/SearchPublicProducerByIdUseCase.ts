import type { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import type { PublicProducerDAOInterface } from '../../../domain/interfaces/user/PublicProducerDAOInterface';
import { toPublicProducerDTO, type PublicProducerDetailDTO } from '../../dto/userDTO/PublicProducerDTO';
import { ApplicationError } from '../../errors/ApplicationError';
import type { UseCase } from '../useCase';

export class SearchPublicProducerById implements UseCase<string, PublicProducerDetailDTO> {
    constructor(
        private readonly producerDAO: PublicProducerDAOInterface,
        private readonly offerDAO: OfferDAOInterface
    ) {}

    public async execute(id: string): Promise<PublicProducerDetailDTO> {
        const producer = await this.producerDAO.searchPublicProducerById(id);
        if (!producer) throw new ApplicationError('USER_NOT_FOUND', 'Produtor não encontrado');

        // The catalog query uses the database calendar to exclude unavailable offers.
        const activeOffers = await this.offerDAO.searchActive();
        const offers = activeOffers.filter(offer => offer.userId === producer.id);
        return {
            producer: { ...toPublicProducerDTO(producer), activeOfferCount: offers.length },
            offers: offers.map(offer => ({
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
                endDate: offer.endDate
            }))
        };
    }
}

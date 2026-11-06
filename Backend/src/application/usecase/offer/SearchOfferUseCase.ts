import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { OfferSearchDTO } from '../../dto/offerDTO/OfferSearchDTO';
import { UseCase } from '../useCase';

export class SearchOffer implements UseCase<void, OfferSearchDTO[]> {
    constructor(private readonly offerDAO: OfferDAOInterface) {}

    public async execute(): Promise<OfferSearchDTO[]> {
        const offers = await this.offerDAO.search();
        return offers.map((offer): OfferSearchDTO => ({
            id: offer.id,
            userId: offer.userId,
            title: offer.title,
            type: offer.type,
            size: offer.size,
            price: offer.price,
            weight: offer.weight,
            location: offer.location,
            startDate: offer.startDate,
            endDate: offer.endDate,
            status: offer.status
        }));
    }
}

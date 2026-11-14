import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { OfferSearchDTO } from '../../dto/offerDTO/OfferSearchDTO';
import { UseCase } from '../useCase';
import { OfferStatus } from '../../../domain/model/offer';

export type PublicOfferDTO = Omit<OfferSearchDTO, 'userId' | 'status'> & {
    description: string;
    maximumQuantity: number;
    minimumQuantity: number;
};

export class SearchOffer implements UseCase<void, OfferSearchDTO[]> {
    constructor(private readonly offerDAO: OfferDAOInterface) {}

    public async execute(): Promise<OfferSearchDTO[]> {
        const offers = await this.offerDAO.search();
        return offers.filter(offer => offer.status !== OfferStatus.DRAFT).map((offer): OfferSearchDTO => ({
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

    public async executePublic(): Promise<PublicOfferDTO[]> {
        const offers = await this.offerDAO.searchActive();
        return offers.map(offer => ({
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
        }));
    }
}

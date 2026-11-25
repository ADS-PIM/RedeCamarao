import { MarketplaceList, MarketplaceRegion, OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { OfferSearchDTO } from '../../dto/offerDTO/OfferSearchDTO';
import { UseCase } from '../useCase';
import { OfferStatus } from '../../../domain/model/offer';

export type PublicOfferDTO = Omit<OfferSearchDTO, 'userId' | 'status'> & {
    description: string;
    maximumQuantity: number;
    minimumQuantity: number;
    coverPhoto: string | null;
    createdAt: Date;
    shelf?: 'featured' | 'wholesale' | 'regional';
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

    public async executePublic(list: MarketplaceList = 'recent', region?: MarketplaceRegion): Promise<PublicOfferDTO[]> {
        const offers = await this.offerDAO.searchActive(list, region);
        return offers.map(offer => ({
            id: offer.id,
            title: offer.title,
            description: offer.description,
            createdAt: offer.createdAt,
            shelf: offer.shelf,
            type: offer.type,
            size: offer.size,
            price: offer.price,
            weight: offer.weight,
            maximumQuantity: offer.maximumQuantity,
            minimumQuantity: offer.minimumQuantity,
            coverPhoto: offer.coverPhoto,
            location: offer.location,
            startDate: offer.startDate,
            endDate: offer.endDate
        }));
    }
}

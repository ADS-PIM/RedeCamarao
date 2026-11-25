import { Offer, OfferStatus, propsOffer } from '../../model/offer';

export type OfferUpdateData = Partial<Pick<propsOffer,
    'title' | 'description' | 'type' | 'size' | 'price' | 'weight' |
    'maximumQuantity' | 'minimumQuantity' | 'location'
> & {
    startDate: string;
    endDate: string;
    status: OfferStatus;
}>;

export type MarketplaceList = 'recent' | 'popular' | 'featured' | 'showcase';
export type MarketplaceRegion = { code: string; name: string };

export interface OfferDAOInterface {
    create(offer: Offer): Promise<void>;
    search(): Promise<Offer[]>;
    searchActive(list?: MarketplaceList, region?: MarketplaceRegion): Promise<Offer[]>;
    listByUserId(userId: string): Promise<Offer[]>;
    searchById(id: string): Promise<Offer | null>;
    update(id: string, userId: string, data: OfferUpdateData): Promise<boolean>;
    delete(id: string, userId: string): Promise<boolean>;
}

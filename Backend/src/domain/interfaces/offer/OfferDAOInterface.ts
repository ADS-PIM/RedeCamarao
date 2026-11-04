import { Offer, OfferStatus, propsOffer } from '../../model/offer';

export type OfferUpdateData = Partial<Pick<propsOffer,
    'title' | 'description' | 'type' | 'size' | 'price' | 'weight' |
    'maximumQuantity' | 'minimumQuantity' | 'location'
> & {
    startDate: string;
    endDate: string;
    status: OfferStatus;
}>;

export interface OfferDAOInterface {
    create(offer: Offer): Promise<void>;
    listByUserId(userId: string): Promise<Offer[]>;
    searchById(id: string): Promise<Offer | null>;
    update(id: string, userId: string, data: OfferUpdateData): Promise<boolean>;
}

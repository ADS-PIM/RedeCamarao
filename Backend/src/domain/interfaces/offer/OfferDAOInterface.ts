import { Offer } from '../../model/offer';

export interface OfferDAOInterface {
    create(offer: Offer): Promise<void>;
}

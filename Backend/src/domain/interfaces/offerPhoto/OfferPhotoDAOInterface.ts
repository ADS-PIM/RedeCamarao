import { OfferPhoto, propsOfferPhoto } from '../../model/offerPhoto';

export type OfferPhotoUpdateData = Partial<Pick<propsOfferPhoto, 'imageUrl' | 'description'>>;

export interface OfferPhotoDAOInterface {
    create(photo: OfferPhoto, userId: string): Promise<boolean>;
    searchByOfferId(offerId: string): Promise<OfferPhoto[]>;
    searchById(id: string): Promise<OfferPhoto | null>;
    update(id: string, offerId: string, userId: string, data: OfferPhotoUpdateData): Promise<boolean>;
    delete(id: string, offerId: string, userId: string): Promise<boolean>;
}

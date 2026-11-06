import { OfferPhoto } from '../../../domain/model/offerPhoto';

export class OfferPhotoSearchDTO {
    id: string;
    offerId: string;
    imageUrl: string;
    description: string;

    public static fromModel(photo: OfferPhoto): OfferPhotoSearchDTO {
        return { id: photo.id, offerId: photo.offerId, imageUrl: photo.imageUrl, description: photo.description };
    }
}

import { OfferStatus } from '../../../domain/model/offer';

export class OfferSearchByUserIdDTO {
    id: string;
    title: string;
    type: string | null;
    size: string;
    price: number;
    weight: number;
    location: string;
    startDate: Date;
    endDate: Date;
    status: OfferStatus;
}

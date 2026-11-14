import { OfferStatus } from '../../../domain/model/offer';

export class OfferSearchByUserIdDTO {
    id: string;
    title: string;
    description: string;
    type: string | null;
    size: string;
    price: number;
    weight: number;
    minimumQuantity: number;
    maximumQuantity: number;
    location: string;
    startDate: Date;
    endDate: Date;
    status: OfferStatus;
    createdAt: Date;
}

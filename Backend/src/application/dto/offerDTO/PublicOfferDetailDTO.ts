import type { PublicOfferDTO } from '../../usecase/offer/SearchOfferUseCase';

export type PublicOfferDetailDTO = PublicOfferDTO & {
    createdAt: Date;
    photos: {
        id: string;
        imageUrl: string;
        description: string;
    }[];
    producer: {
        id: string;
        name: string;
        description: string | null;
        location: string | null;
        phone: string | null;
        businessHours: string | null;
        profilePicture: string | null;
        activeOfferCount: number;
    };
};

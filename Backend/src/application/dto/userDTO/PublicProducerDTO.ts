import type { PublicProducer } from '../../../domain/interfaces/user/PublicProducerDAOInterface';
import type { PublicOfferDTO } from '../../usecase/offer/SearchOfferUseCase';

export type PublicProducerDTO = PublicProducer;

export type PublicProducerDetailDTO = {
    producer: PublicProducerDTO;
    offers: PublicOfferDTO[];
};

export function toPublicProducerDTO(producer: PublicProducer): PublicProducerDTO {
    return {
        id: producer.id,
        name: producer.name,
        description: producer.description,
        location: producer.location,
        businessHours: producer.businessHours,
        activeOfferCount: producer.activeOfferCount
    };
}

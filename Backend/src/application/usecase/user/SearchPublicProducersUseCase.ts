import type { PublicProducerDAOInterface } from '../../../domain/interfaces/user/PublicProducerDAOInterface';
import { toPublicProducerDTO, type PublicProducerDTO } from '../../dto/userDTO/PublicProducerDTO';
import type { UseCase } from '../useCase';

export class SearchPublicProducers implements UseCase<void, PublicProducerDTO[]> {
    constructor(private readonly producerDAO: PublicProducerDAOInterface) {}

    public async execute(): Promise<PublicProducerDTO[]> {
        const producers = await this.producerDAO.listPublicProducers();
        return producers.map(toPublicProducerDTO);
    }
}

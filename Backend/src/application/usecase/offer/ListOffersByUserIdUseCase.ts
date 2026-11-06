import { ApplicationError } from '../../errors/ApplicationError';
import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface';
import { OfferSearchByUserIdDTO } from '../../dto/offerDTO/OfferSearchByUserIdDTO';
import { UseCase } from '../useCase';

export class ListOffersByUserId implements UseCase<string, OfferSearchByUserIdDTO[]> {
    constructor(
        private readonly offerDAO: OfferDAOInterface,
        private readonly userDAO: UserDAOInterface
    ) {}

    public async execute(userId: string): Promise<OfferSearchByUserIdDTO[]> {
        if (!(await this.userDAO.searchById(userId))) {
            throw new ApplicationError('USER_NOT_FOUND', 'Usuário não encontrado');
        }

        const offers = await this.offerDAO.listByUserId(userId);
        return offers.map((offer): OfferSearchByUserIdDTO => ({
            id: offer.id,
            title: offer.title,
            type: offer.type,
            size: offer.size,
            price: offer.price,
            weight: offer.weight,
            location: offer.location,
            startDate: offer.startDate,
            endDate: offer.endDate,
            status: offer.status
        }));
    }
}

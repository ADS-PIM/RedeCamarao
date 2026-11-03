import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface';
import { Offer } from '../../../domain/model/offer';
import { OfferCreateDTO } from '../../dto/offerDTO/OfferCreateDTO';
import { UseCase } from '../useCase';
import { SearchByIdUser } from '../user/SearchUserByIdUseCase';

export class CreateOffer implements UseCase<{ userId: string; data: OfferCreateDTO }, void> {
    constructor(
        private readonly offerDAO: OfferDAOInterface,
        private readonly userDAO: UserDAOInterface
    ) {}

    public async execute({ userId, data }: { userId: string; data: OfferCreateDTO }): Promise<void> {
        if (data.minimumQuantity > data.maximumQuantity) {
            throw new Error('Minimum quantity cannot exceed maximum quantity');
        }

        if (data.endDate < data.startDate) {
            throw new Error('End date cannot precede start date');
        }

        const searchByIdUser = new SearchByIdUser(this.userDAO);
        if (!(await searchByIdUser.execute(userId))) {
            throw new Error('User not found');
        }

        const offer = Offer.construct({
            ...data,
            userId,
            startDate: new Date(`${data.startDate}T00:00:00.000Z`),
            endDate: new Date(`${data.endDate}T00:00:00.000Z`)
        });

        await this.offerDAO.create(offer);
    }
}

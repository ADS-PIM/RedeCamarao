import { ApplicationError } from '../../errors/ApplicationError';
import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface';
import { UserType } from '../../../domain/model/user';
import { Offer } from '../../../domain/model/offer';
import { OfferCreateDTO } from '../../dto/offerDTO/OfferCreateDTO';
import { UseCase } from '../useCase';
import { offerDate } from './offerDate';

export class CreateOffer implements UseCase<{ userId: string; data: OfferCreateDTO }, void> {
    constructor(
        private readonly offerDAO: OfferDAOInterface,
        private readonly userDAO: UserDAOInterface
    ) {}

    public async execute({ userId, data }: { userId: string; data: OfferCreateDTO }): Promise<void> {
        const user = await this.userDAO.searchById(userId);
        if (!user) {
            throw new ApplicationError('USER_NOT_FOUND', 'User not found');
        }

       if (user.userType !== UserType.PRODUCER) {
            throw new ApplicationError('FORBIDDEN', 'Only producers can post offers');
       }

       const startDate = offerDate(data.startDate);
       const endDate = offerDate(data.endDate);

       if (data.minimumQuantity > data.maximumQuantity) {
            throw new ApplicationError('INVALID_QUANTITY_RANGE', 'The minimum quantity cannot exceed the maximum quantity')
       }

       if (endDate < startDate) {
            throw new ApplicationError('INVALID_DATE_RANGE', 'The end date cannot precede the start date')
       }
        const offer = Offer.construct({
            ...data,
            userId,
            startDate: new Date(`${startDate}T00:00:00.000Z`),
            endDate: new Date(`${endDate}T00:00:00.000Z`)
        });

        await this.offerDAO.create(offer);
    }
}

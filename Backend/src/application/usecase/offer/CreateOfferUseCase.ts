import { ApplicationError } from '../../errors/ApplicationError';
import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface';
import { Offer } from '../../../domain/model/offer';
import { OfferCreateDTO } from '../../dto/offerDTO/OfferCreateDTO';
import { UseCase } from '../useCase';
import { SearchByIdUser } from '../user/SearchUserByIdUseCase';
import { offerDate } from './offerDate';

export class CreateOffer implements UseCase<{ userId: string; data: OfferCreateDTO }, void> {
    constructor(
        private readonly offerDAO: OfferDAOInterface,
        private readonly userDAO: UserDAOInterface
    ) {}

    public async execute({ userId, data }: { userId: string; data: OfferCreateDTO }): Promise<void> {
        const startDate = offerDate(data.startDate);
        const endDate = offerDate(data.endDate);
        if (data.minimumQuantity > data.maximumQuantity) {
            throw new ApplicationError('INVALID_QUANTITY_RANGE', 'A quantidade mínima não pode exceder a quantidade máxima');
        }

        if (endDate < startDate) {
            throw new ApplicationError('INVALID_DATE_RANGE', 'A data de término não pode preceder a data de início');
        }

        const searchByIdUser = new SearchByIdUser(this.userDAO);
        if (!(await searchByIdUser.execute(userId))) {
            throw new ApplicationError('USER_NOT_FOUND', 'Usuário não encontrado');
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

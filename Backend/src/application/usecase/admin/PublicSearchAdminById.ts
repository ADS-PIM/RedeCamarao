import { AdminDAOInterface } from "../../../domain/interfaces/AdminDAOInterface";
import { AdminSearchByIdDTO} from "../../dto/AdminInputDTO";
import { UseCase } from "../useCase";

export class SearchPublicById implements UseCase<string, AdminSearchByIdDTO | null> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute(id: string): Promise<AdminSearchByIdDTO | null> {
        const admin = await this.adminDAO.searchPublicById(id);
        return admin ? admin : null;
    }
}
import { AdminDAOInterface } from "../../../domain/interfaces/AdminDAOInterface";
import { AdminSearchDTO} from "../../dto/adminDTO/AdminSearchDTO";
import { UseCase } from "../useCase";

export class SearchAllAdmins implements UseCase<void, AdminSearchDTO[] | null> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute(): Promise<AdminSearchDTO[] | null> {
        const admins = await this.adminDAO.searchAll();
        return admins;
    }
}
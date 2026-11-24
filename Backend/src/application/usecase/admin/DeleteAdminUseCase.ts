import { AdminAudit, AdminDAOInterface } from "../../../domain/interfaces/admin/AdminDAOInterface";
import { UseCase } from "../useCase";
type Removal = { id: string; audit: AdminAudit };

export class DeleteAdmin implements UseCase<Removal, void> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute({ id, audit }: Removal): Promise<void> {
        await this.adminDAO.delete(id, audit);
    }
}

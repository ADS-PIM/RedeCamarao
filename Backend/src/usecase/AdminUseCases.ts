import { Admin } from "../dominio/model/admin";
import { AdminDAOInterface } from "../dominio/interfaces/AdminDAOInterface";
import { AdminCreateDTO, AdminSearchByIdDTO, AdminSearchDTO } from "../dto/AdminInputDTO";
import { UseCase } from "./useCase";
import { PasswordCrypto } from "../service/passwordCrypto";

export class CreateAdmin implements UseCase<AdminCreateDTO, null>{
    constructor(private readonly adminDAO: AdminDAOInterface){}

    public async execute(adminCreateDTO: AdminCreateDTO): Promise<any> {
        try {
            const searchByEmailAdmin = new SearchByEmailAdmin(this.adminDAO);

            if (!adminCreateDTO.name || !adminCreateDTO.email || !adminCreateDTO.password || !adminCreateDTO.role) {
                throw new Error('Missing required fields');
            }

            if (await searchByEmailAdmin.execute(adminCreateDTO.email)) {
                throw new Error('Email already registered');
            }

            adminCreateDTO.password = await PasswordCrypto.hashPassword(adminCreateDTO.password);
            const admin = Admin.construct(adminCreateDTO);

            await this.adminDAO.register(admin);
        } catch (error: any) {
            throw new Error('Error registering admin: ' + error.message);
        }
    }
}

export class SearchByEmailAdmin implements UseCase<string, Admin | null>{
    constructor(private readonly adminDAO: AdminDAOInterface){}

    public async execute(email: string): Promise<Admin | null> {
        const admin: Admin | null = await this.adminDAO.searchByEmail(email);
        return admin ? Admin.reconstruct(admin) : null;
    }
}

export class SearchByIdAdmin implements UseCase<string, Admin | null>{
    constructor(private readonly adminDAO: AdminDAOInterface){}

    public async execute(id: string): Promise<Admin | null> {
        const admin: Admin | null = await this.adminDAO.searchById(id);
        return admin ? Admin.reconstruct(admin) : null;
    }
}

export class UpdateAdmin implements UseCase<{ id: string, data: any }, void> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute({ id, data }: { id: string, data: any }): Promise<void> {
        const searchByEmailAdmin = new SearchByEmailAdmin(this.adminDAO);
        if (data.email !== undefined) {
            const adminWithEmail = await searchByEmailAdmin.execute(data.email);
            if (adminWithEmail && adminWithEmail.id !== id) {
                throw new Error('Email already registered');
            }
        }

        if (data.password !== undefined) {
            data.password = await PasswordCrypto.hashPassword(data.password);
        }

        await this.adminDAO.update(id, data);
    }
}

export class DeleteAdmin implements UseCase<string, void> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute(id: string): Promise<void> {
        const searchByIdAdmin = new SearchByIdAdmin(this.adminDAO);
        const admin = await searchByIdAdmin.execute(id);

        if (!admin) {
            throw new Error('Admin not found');
        }

        if (admin.role === 'SUPER_ADMIN') {
            throw new Error('Cannot delete SUPER_ADMIN');
        }
        await this.adminDAO.delete(id);
    }
}

export class SearchAllAdmins implements UseCase<void, AdminSearchDTO[] | null> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute(): Promise<AdminSearchDTO[] | null> {
        const admins = await this.adminDAO.searchAll();
        return admins;
    }
}

export class SearchPublicById implements UseCase<string, AdminSearchByIdDTO | null> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute(id: string): Promise<AdminSearchByIdDTO | null> {
        const admin = await this.adminDAO.searchPublicById(id);
        return admin ? admin : null;
    }
}
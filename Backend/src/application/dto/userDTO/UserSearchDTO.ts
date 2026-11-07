import { UserType } from '../../../domain/model/user';

export class UserSearchDTO {
    name!: string;
    email!: string;
    userType!: UserType;
    description!: string | null;
    location!: string | null;
    phone!: string | null;
    whatsapp!: string | null;
    businessHours!: string | null;
    createdAt!: Date;
}

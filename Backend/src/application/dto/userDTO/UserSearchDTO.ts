import { UserType } from '../../../domain/model/user';

export class UserSearchDTO {
    name!: string;
    email!: string;
    userType!: UserType;
    location!: string;
    phone!: string;
    whatsapp!: string | null;
    createdAt!: Date;
}

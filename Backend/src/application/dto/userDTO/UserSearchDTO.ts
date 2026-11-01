import { UserType } from '../../../domain/model/user';

export class UserSearchDTO {
    name: string;
    email: string;
    userType: UserType;
    createdAt: Date;
}

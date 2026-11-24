import { UserSearchDTO } from './UserSearchDTO';

export class UserSearchByIdDTO extends UserSearchDTO {
    id: string;
    accountStatus: string;
    profilePicture: string | null;
}

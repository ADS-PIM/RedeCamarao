import { UserSearchDTO } from './UserSearchDTO';

export class UserSearchByIdDTO extends UserSearchDTO {
    id: string;
    profilePicture: string | null;
}

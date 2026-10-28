import { AdminRole } from '../../../domain/model/admin';


export class AdminSearchByIdDTO {
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    active: boolean;
    profile_picture: string | null;
}
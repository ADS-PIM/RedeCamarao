import { AdminRole } from '../../../domain/model/admin';

export class AdminSearchDTO {
    name: string;
    email: string;
    role: AdminRole;
    active: boolean;
    createdAt: Date;
    profile_picture: string | null;
}
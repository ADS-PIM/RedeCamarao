import { User } from "../../model/user";

export type UserUpdateData = {
    name? : string;
    email? : string;
    password? : string;
}

export interface UserDAOInterface {
    register(user: User): Promise<void>
    searchByEmail(email: string): Promise<User | null>
    searchById(id: string): Promise<User | null>
    update(id: string, data: UserUpdateData): Promise<void>
    delete(id: string): Promise<void>
}
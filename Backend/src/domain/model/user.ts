import { randomUUID } from 'node:crypto';

export enum UserType {
    PRODUCER = 'PRODUCER',
    BUYER = 'BUYER'
}

export type propsUser = {
    id: string;
    name: string;
    email: string;
    password: string;
    userType: UserType;
    cpf_cnpj: string;
    description: string | null;
    location: string | null;
    phone: string | null;
    businessHours: string | null;
    createdAt: Date;
}

export class User {
    constructor(private props: propsUser) {}

    public static construct({name, email, password, userType, cpf_cnpj, description, location, phone, businessHours}: { name: string; email: string; password: string; userType: UserType; cpf_cnpj: string; description?: string | null; location?: string; phone?: string; businessHours?: string | null }): User{

         if (!name || !email || !password || !userType || !cpf_cnpj) {
            throw new Error('All required fields must be provided');
        }

        if (!Object.values(UserType).includes(userType)) {
            throw new Error('Invalid user type');
        }

        return new User({
            id: randomUUID(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            userType,
            cpf_cnpj,
            description: description?.trim() || null,
            location: location?.trim() || null,
            phone: phone?.trim() || null,
            businessHours: businessHours?.trim() || null,
            createdAt: new Date()
        });
    }

    public static reconstruct(props: propsUser): User {
        return new User(props);
    }

    get id() {
        return this.props.id;
    }

    get name() {
        return this.props.name;
    }

    get email() {
        return this.props.email;
    }

    get password() {
        return this.props.password;
    }

    get userType() {
        return this.props.userType;
    }

    get cpf_cnpj() {
        return this.props.cpf_cnpj;
    }

    get description() {
        return this.props.description;
    }

    get location() {
        return this.props.location;
    }

    get phone() {
        return this.props.phone;
    }

    get businessHours() {
        return this.props.businessHours;
    }

    get createdAt() {
        return this.props.createdAt;
    }
}
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
    location: string;
    phone: string;
    whatsapp: string | null;
    createdAt: Date;
}

export class User {
    constructor(private props: propsUser) {}

    public static construct({name, email, password, userType, cpf_cnpj, location, phone, whatsapp}: { name: string; email: string; password: string; userType: UserType; cpf_cnpj: string; location: string; phone: string; whatsapp: string | null }): User{

        if (!name || !email || !password || !userType || !cpf_cnpj || !location || !phone) {
            throw new Error('All fields are required');
        }

        return new User({ 
            id: crypto.randomUUID(), 
            name: name.trim(), 
            email: email.trim().toLowerCase(), 
            password, 
            userType, 
            cpf_cnpj, 
            location: location.trim(), 
            phone: phone.trim(),
            whatsapp: whatsapp ? whatsapp.trim() : null, 
            createdAt: new Date() });
    }

    public static reconstruct(props: propsUser) {
        return new User(props);
    }

    get id () {
        return this.props.id;
    }

    get name () {
        return this.props.name;
    }

    get email () {
        return this.props.email;
    }

    get password () {
        return this.props.password;
    }

    get userType () {
        return this.props.userType;
    }

    get cpf_cnpj () {
        return this.props.cpf_cnpj;
    }

    get location () {
        return this.props.location;
    }

    get phone () {
        return this.props.phone;
    }

    get whatsapp () {
        return this.props.whatsapp;
    }

    get createdAt () {
        return this.props.createdAt;
    }
}
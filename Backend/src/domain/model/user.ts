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
}

export class User {
    constructor(private props: propsUser) {}

    public static construct({name, email, password, userType, cpf_cnpj}: { name: string; email: string; password: string; userType: UserType; cpf_cnpj: string}): User{

        if (!name || !email || !password || !userType || !cpf_cnpj) {
            throw new Error('Os dados obrigatórios não foram preenchidos')
        }

        return new User({ id: crypto.randomUUID().toString(), name, email, password, userType, cpf_cnpj });
    }
}
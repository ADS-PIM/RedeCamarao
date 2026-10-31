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
    createdAt: Date;
}

export class User {
    constructor(private props: propsUser) {}

    public static construct({name, email, password, userType, cpf_cnpj}: { name: string; email: string; password: string; userType: UserType; cpf_cnpj: string}): User{

        if (!name || !email || !password || !userType || !cpf_cnpj) {
            throw new Error('All fields are required');
        }

        return new User({ id: crypto.randomUUID().toString(), name, email, password, userType, cpf_cnpj, createdAt: new Date() });
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

    get createdAt () {
        return this.props.createdAt;
    }
}
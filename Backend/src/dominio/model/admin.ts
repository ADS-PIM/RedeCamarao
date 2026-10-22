// import { AdminCreateDTO } from "../dto/admin.dto";

export enum AdminRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN'
}

export type propsAdmin = {
    id: string;
    name: string;
    email: string;
    password: string;
    role: AdminRole;
    active: boolean;
    createdAt: Date;
    profile_picture: string | null;
}

export class Admin {
    constructor(private props: propsAdmin) {}

    // public static construct({name, email, password, role}: AdminCreateDTO) {
    //     const props: propsAdmin = {
    //         id: crypto.randomUUID(),
    //         name,
    //         email,
    //         password,
    //         role: role as AdminRole,
    //         active: true,
    //         createdAt: new Date(),
    //         profile_picture: null
    //     }
    //     return new Admin(props);
    // }

    public static create(name: string, email: string, password: string, role: AdminRole, active: boolean, createdAt: Date, profile_picture: string | null): Admin{

        if (!name || !email || !password || !role) {
            throw new Error('Os dados obrigatórios não foram preenchidos')
        }

        return new Admin({ id: crypto.randomUUID().toString(), name, email, password, role, active, createdAt, profile_picture});
    }

    public static reconstruct(props: propsAdmin) {
        return new Admin(props);
    }

    public get id () {
        return this.props.id;
    }

    public get name () {
        return this.props.name;
    }

    public get email () {
        return this.props.email;
    }

    public get password () {
        return this.props.password;
    }

    public get role () {
        return this.props.role;
    }

    public get active () {
        return this.props.active;
    }

    public get createdAt () {
        return this.props.createdAt;
    }

    public get profile_picture () {
        return this.props.profile_picture;
    }
}
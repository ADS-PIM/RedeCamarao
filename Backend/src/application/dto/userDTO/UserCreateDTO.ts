import { IsNotEmpty, IsString, IsEmail, IsEnum, Matches} from 'class-validator';
import { UserType } from '../../../domain/model/user';

export class UserCreateDTO {
    @IsNotEmpty()
    @IsString()
    name!: string;

    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @IsNotEmpty()
    @IsString()     
    password!: string;

    @IsNotEmpty()
    @IsEnum(UserType)
    userType!: UserType;

    @IsNotEmpty()
    @IsString()
    @Matches(/^(\d{11}|\d{14})$/, {
        message: 'CPF/CNPJ must have 11 or 14 digits'
    })
    cpf_cnpj!: string;
}
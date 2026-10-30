import { IsNotEmpty, IsString, IsEmail, IsEnum } from 'class-validator';
import { UserType } from '../../../domain/model/user';

export class UserCreateDTO {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()     
    password: string;

    @IsNotEmpty()
    @IsEnum(UserType)
    userType: UserType;

    @IsNotEmpty()
    @IsString()
    cpf_cnpj: string;
}
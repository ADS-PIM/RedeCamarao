import { IsNotEmpty, IsString, IsEmail, IsEnum } from 'class-validator';
import { AdminRole } from '../../../domain/model/admin';

export class AdminCreateDTO {
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
    @IsEnum(AdminRole)
    role: AdminRole; 
}
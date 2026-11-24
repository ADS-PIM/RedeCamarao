import { IsNotEmpty, IsString, IsEmail, IsEnum, Length, IsOptional, MaxLength } from 'class-validator';
import { AdminRole } from '../../../domain/model/admin';

export class AdminCreateDTO {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    name: string;

    @IsNotEmpty()
    @IsEmail()
    @MaxLength(320)
    email: string;

    @IsNotEmpty()
    @IsString()     
    @Length(8, 72)
    password: string;

    @IsOptional()
    @IsString()
    @Length(1, 2000)
    justification?: string;

    @IsNotEmpty()
    @IsEnum(AdminRole)
    role: AdminRole; 
}

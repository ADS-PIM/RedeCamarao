import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AdminRole } from '../../../domain/model/admin';

export class AdminUpdateDTO {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsEnum(AdminRole)
    role?: AdminRole;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsString()
    profile_picture?: string | null;
}
import {IsOptional, IsString, IsEmail, IsNotEmpty} from 'class-validator';

export class UserUpdateDTO {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    password?: string;
}
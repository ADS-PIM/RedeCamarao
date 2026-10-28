import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class AdminLoginDTO {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}
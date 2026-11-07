import {IsOptional, IsString, IsEmail, IsNotEmpty, Matches, MinLength, MaxLength} from 'class-validator';

export class UserUpdateDTO {

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    name?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(320)
    email?: string;

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    location?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    @Matches(/^\+?[\d()\s-]{10,20}$/)
    phone?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    @Matches(/^\+?[\d()\s-]{10,20}$/)
    whatsapp?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    businessHours?: string | null;
}
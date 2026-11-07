import {IsOptional, IsString, IsEmail, IsNotEmpty, Matches, MinLength, MaxLength} from 'class-validator';

export class UserUpdateDTO {
     @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password?: string;

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    location?: string;

    @IsOptional()
    @IsNotEmpty()
    @Matches(/^\+?[\d()\s-]{10,20}$/, {
        message: 'Invalid phone number'
    })
    phone?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\+?[\d()\s-]{10,20}$/, {
        message: 'Invalid WhatsApp number'
    })
    whatsapp?: string;
}
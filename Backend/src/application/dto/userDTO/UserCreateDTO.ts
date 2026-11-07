import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, Matches, MinLength, MaxLength} from 'class-validator';
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
    @MinLength(8)
    @MaxLength(72)
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

    @IsNotEmpty()
    @IsString()
    location!: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^\+?[\d()\s-]{10,20}$/, {
        message: 'Invalid phone number'
    })
    phone!: string;

    @IsOptional()
    @IsString()
    @Matches(/^\+?[\d()\s-]{10,20}$/, {
        message: 'Invalid WhatsApp number'
    })
    whatsapp?: string;
}
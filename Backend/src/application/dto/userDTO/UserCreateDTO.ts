import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, Matches, MinLength, MaxLength} from 'class-validator';
import { UserType } from '../../../domain/model/user';

export class UserCreateDTO {

    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    name!: string;

    @IsNotEmpty()
    @IsEmail()
    @MaxLength(320)
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

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    location?: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(20)
    @Matches(/^\+?[\d()\s-]{10,20}$/)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    businessHours?: string;
}
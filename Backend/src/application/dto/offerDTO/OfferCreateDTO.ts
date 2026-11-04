import { IsDateString, IsNotEmpty, IsNumber, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class OfferCreateDTO {
    @IsNotEmpty()
    @IsString()
    title!: string;

    @IsNotEmpty()
    @IsString()
    description!: string;

    @IsNotEmpty()
    @IsString()
    type!: string;

    @IsNotEmpty()
    @IsString()
    size!: string;

    @IsNotEmpty()
    @IsNumber({ maxDecimalPlaces: 2 })
    price!: number;

    @IsNotEmpty()
    @IsNumber({ maxDecimalPlaces: 2 })
    weight!: number;

    @IsNotEmpty()
    @IsNumber({ maxDecimalPlaces: 2 })
    maximumQuantity!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    minimumQuantity!: number;

    @IsNotEmpty()
    @IsString()
    location!: string;

    @IsNotEmpty()
    @IsDateString()
    startDate!: string;

    @IsNotEmpty()
    @IsDateString()
    endDate!: string;
}

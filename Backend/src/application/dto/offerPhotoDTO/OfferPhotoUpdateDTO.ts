import { IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';
import { OfferPhotoUpdateData } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';

export class OfferPhotoUpdateDTO implements OfferPhotoUpdateData {
    @ValidateIf((_object, value) => value !== undefined)
    @IsString({ message: 'A URL da imagem deve ser um texto' })
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_valid_protocol: true, require_tld: false },
        { message: 'A URL da imagem deve ser uma URL HTTP ou HTTPS válida' })
    @MaxLength(2048, { message: 'A URL da imagem deve ter no máximo 2048 caracteres' })
    imageUrl?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsString({ message: 'A descrição deve ser um texto' })
    @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
    description?: string;
}

import { ApplicationError } from '../../errors/ApplicationError';
import { offerDate } from '../../usecase/offer/offerDate';

export type EditorPhoto = { id?: string; data?: string; description: string };
export type OfferEditorData = {
    title: string; description: string; type: string; size: string; price: number; weight: number;
    minimumQuantity: number; maximumQuantity: number; location: string;
    startDate: string; endDate: string; status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
};
const invalid = (message: string): never => { throw new ApplicationError('INVALID_DATA', message); };

export function parseOfferEditor(body: unknown): { offer: OfferEditorData; photos: EditorPhoto[] } {
    if (!body || typeof body !== 'object') return invalid('Dados da oferta inválidos');
    const { offer, photos } = body as { offer: OfferEditorData; photos: EditorPhoto[] };
    if (!offer || typeof offer !== 'object' || !Array.isArray(photos) || photos.length > 5) return invalid('Adicione no máximo 5 fotos');
    const limits = { title: 255, description: 1000, type: 255, size: 255, location: 255 } as const;
    const data = {} as OfferEditorData;
    for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
        if (typeof offer[key] !== 'string' || !offer[key].trim() || offer[key].length > limits[key]) return invalid('Confira os campos de texto da oferta');
        data[key] = offer[key].trim();
    }
    for (const key of ['price', 'weight', 'minimumQuantity', 'maximumQuantity'] as const) {
        const value = offer[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 99999999.99 || Math.abs(value * 100 - Math.round(value * 100)) > .00001) return invalid('Preços e quantidades devem ser positivos, com até duas casas decimais');
        data[key] = value;
    }
    if (data.minimumQuantity > data.maximumQuantity || data.maximumQuantity > data.weight) return invalid('A quantidade mínima deve ser menor ou igual à máxima, e a máxima não pode exceder o lote disponível');
    if (typeof offer.startDate !== 'string' || typeof offer.endDate !== 'string') return invalid('Informe o período de disponibilidade');
    data.startDate = offerDate(offer.startDate);
    data.endDate = offerDate(offer.endDate);
    if (data.endDate < data.startDate) return invalid('A data final não pode ser anterior à data inicial');
    if (!['ACTIVE', 'INACTIVE', 'DRAFT'].includes(offer.status)) return invalid('Status inválido');
    data.status = offer.status;
    const seen = new Set<string>();
    const parsed = photos.map(photo => {
        if (!photo || typeof photo !== 'object' || typeof photo.description !== 'string' || photo.description.length > 500) return invalid('Descrição da foto inválida');
        if (typeof photo.id === 'string' && photo.id.length <= 36 && photo.id && photo.data === undefined) {
            if (seen.has(photo.id)) return invalid('Foto duplicada');
            seen.add(photo.id);
            return { id: photo.id, description: photo.description };
        }
        if (typeof photo.data !== 'string' || photo.id !== undefined) return invalid('Foto inválida');
        decodeEditorImage(photo.data);
        return { data: photo.data, description: photo.description };
    });
    return { offer: data, photos: parsed };
}

export function decodeEditorImage(data: string) {
    const match = data.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match || data.length > 4.1 * 1024 * 1024) return invalid('Use fotos JPG ou PNG de até 3 MB');
    const buffer = Buffer.from(match[2], 'base64');
    const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer.at(-2) === 255 && buffer.at(-1) === 217;
    if (!buffer.length || buffer.length > 3 * 1024 * 1024 || (match[1] === 'png' ? !png : !jpeg)) return invalid('O arquivo deve ser uma imagem JPG ou PNG válida de até 3 MB');
    return { buffer, extension: match[1] === 'png' ? 'png' : 'jpg' };
}

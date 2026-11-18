import { randomUUID } from 'node:crypto';
import cloudinary from '../config/cloudinary';
import { ApplicationError } from '../application/errors/ApplicationError';
import { connection } from '../util/connection';

export type StoredImage = { publicId: string; imageUrl: string };
type ImageFolder = 'offers' | 'profiles';
const unavailable = () => new ApplicationError('IMAGE_STORAGE_UNAVAILABLE', 'Não foi possível armazenar a foto. Tente novamente.');

// Only URLs created by this application in the configured cloud can be deleted.
export function managedImageId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        const cloud = cloudinary.config().cloud_name;
        if (!cloud || url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com'
            || url.port || url.username || url.password || url.search || url.hash) return null;
        const prefix = `/${cloud}/image/upload/`;
        if (!url.pathname.startsWith(prefix)) return null;
        return url.pathname.slice(prefix.length)
            .match(/^v\d+\/(redecamarao\/(?:offers|profiles)\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\.(?:png|jpg|jpeg)$/)?.[1] ?? null;
    } catch { return null; }
}

export const imageStorage = {
    async upload(buffer: Buffer, folder: ImageFolder): Promise<StoredImage> {
        const config = cloudinary.config();
        if (!config.cloud_name || !config.api_key || !config.api_secret) throw unavailable();
        const publicId = `redecamarao/${folder}/${randomUUID()}`;
        try {
            const imageUrl = await new Promise<string>((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({
                    public_id: publicId, resource_type: 'image', type: 'upload',
                    allowed_formats: ['jpg', 'jpeg', 'png'], overwrite: false, timeout: 20_000,
                }, (error, result) => {
                    if (error || !result || result.public_id !== publicId || managedImageId(result.secure_url) !== publicId) {
                        reject(unavailable());
                    } else resolve(result.secure_url);
                });
                stream.on('error', reject);
                stream.end(buffer);
            });
            return { publicId, imageUrl };
        } catch {
            // The provider may have received the upload even if its response was lost.
            await imageStorage.removeCreated([publicId]);
            throw unavailable();
        }
    },

    async removeCreated(publicIds: string[]): Promise<void> {
        await Promise.all([...new Set(publicIds)].map(async publicId => {
            try {
                const options = { resource_type: 'image', type: 'upload', invalidate: true, timeout: 10_000 } as const;
                const result = await cloudinary.uploader.destroy(publicId, options);
                if (!['ok', 'not found'].includes(result?.result)) throw new Error('IMAGE_DELETE_FAILED');
            } catch {
                // Never turn a committed database write into an apparent failed save.
                console.error('Não foi possível remover uma imagem do Cloudinary.');
            }
        }));
    },

    async removeUnused(urls: unknown[]): Promise<void> {
        const candidates = [...new Set(urls.filter((url): url is string => managedImageId(url) !== null))];
        if (!candidates.length) return;
        try {
            // The URL CRUD also permits shared images; keep anything still referenced.
            const { rows } = await connection.query<{ imageUrl: string }>(
                `SELECT "imageUrl" FROM "offerPhotos" WHERE "imageUrl" = ANY($1::text[])
                 UNION SELECT "profilePicture" AS "imageUrl" FROM users WHERE "profilePicture" = ANY($1::text[])`,
                [candidates]
            );
            const used = new Set(rows.map(row => row.imageUrl));
            await imageStorage.removeCreated(candidates.filter(url => !used.has(url)).map(url => managedImageId(url)!));
        } catch {
            console.error('Não foi possível verificar as imagens sem uso no Cloudinary.');
        }
    },
};

import { randomUUID } from 'node:crypto';

export type propsOfferPhoto = {
    id: string;
    offerId: string;
    imageUrl: string;
    description: string;
};

export class OfferPhoto {
    constructor(private readonly props: propsOfferPhoto) {}

    public static construct({ offerId, imageUrl, description = '' }: {
        offerId: string; imageUrl: string; description?: string;
    }): OfferPhoto {
        return new OfferPhoto({ id: randomUUID(), offerId, imageUrl, description });
    }

    public static reconstruct(props: propsOfferPhoto): OfferPhoto {
        return new OfferPhoto(props);
    }

    public get id() { return this.props.id; }
    public get offerId() { return this.props.offerId; }
    public get imageUrl() { return this.props.imageUrl; }
    public get description() { return this.props.description; }
}

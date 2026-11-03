import { randomUUID } from 'node:crypto';

export enum OfferStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    EXPIRED = 'EXPIRED',
    SOLD_OUT = 'SOLD_OUT'
}

export type propsOffer = {
    id: string;
    userId: string;
    title: string;
    description: string;
    type: string;
    size: string;
    price: number;
    weight: number;
    maximumQuantity: number;
    minimumQuantity: number;
    location: string;
    startDate: Date;
    endDate: Date;
    status: OfferStatus;
    createdAt: Date;
}

export class Offer {
    constructor(private props: propsOffer) {}

    public static construct({userId, title, description, type, size, price, weight, maximumQuantity, minimumQuantity, location, startDate, endDate}: { userId: string; title: string; description: string; type: string; size: string; price: number; weight: number; maximumQuantity: number; minimumQuantity: number; location: string; startDate: Date; endDate: Date}): Offer{
        if (!userId || !title || !description || !type || !size || !price || !weight || !maximumQuantity || !minimumQuantity || !location || !startDate || !endDate) {
            throw new Error('All fields are required');
        }

        const id = randomUUID();
        const status = OfferStatus.INACTIVE;
        const createdAt = new Date();

        return new Offer({id, userId, title, description, type, size, price, weight, maximumQuantity, minimumQuantity, location, startDate, endDate, status, createdAt});
    }

    public static reconstruct(props: propsOffer) {
        return new Offer(props);
    }

    public get id () {
        return this.props.id;
    }

    public get userId () {
        return this.props.userId;
    }

    public get title () {
        return this.props.title;
    }

    public get description () {
        return this.props.description;
    }

    public get type () {
        return this.props.type;
    }

    public get size () {
        return this.props.size;
    }

    public get price () {
        return this.props.price;
    }

    public get weight () {
        return this.props.weight;
    }

    public get maximumQuantity () {
        return this.props.maximumQuantity;
    }

    public get minimumQuantity () {
        return this.props.minimumQuantity;
    }

    public get location () {
        return this.props.location;
    }

    public get startDate () {
        return this.props.startDate;
    }

    public get endDate () {
        return this.props.endDate;
    }

    public get status () {
        return this.props.status;
    }

    public get createdAt () {
        return this.props.createdAt;
    }
}

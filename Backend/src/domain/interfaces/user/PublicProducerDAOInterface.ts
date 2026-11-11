export type PublicProducer = {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    phone: string | null;
    businessHours: string | null;
    activeOfferCount: number;
};

export interface PublicProducerDAOInterface {
    listPublicProducers(): Promise<PublicProducer[]>;
    searchPublicProducerById(id: string): Promise<PublicProducer | null>;
}

import { connection } from '../../../util/connection';
import { OfferDAOInterface } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { Offer, OfferStatus } from '../../../domain/model/offer';

export class OfferDAOMySQL implements OfferDAOInterface {
    public async create(offer: Offer): Promise<void> {
        await connection.query(
            `INSERT INTO offers (
                id, userId, title, description, type, size, price, weight,
                max_quantity, min_quantity, location,
                start_availability_date, end_availability_date, status, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                offer.id, offer.userId, offer.title, offer.description, offer.type, offer.size,
                offer.price, offer.weight, offer.maximumQuantity, offer.minimumQuantity,
                offer.location, offer.startDate.toISOString().slice(0, 10),
                offer.endDate.toISOString().slice(0, 10), 'PAUSADO', offer.createdAt
            ]
        );
    }
}

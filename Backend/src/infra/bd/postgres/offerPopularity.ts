import { connection } from '../../../util/connection';

export const publicOfferCondition = `status = 'ATIVO' AND NOT admin_disabled
    AND CURRENT_DATE BETWEEN start_availability_date AND end_availability_date
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = offers."userId" AND u.account_status = 'ACTIVE')`;

export async function recordOfferView(offerId: string) {
    await connection.query(`
        INSERT INTO offer_views (offer_id, views)
        SELECT id, 1 FROM offers WHERE id = $1 AND ${publicOfferCondition}
        ON CONFLICT (offer_id) DO UPDATE SET views = offer_views.views + 1`, [offerId]);
}

export async function recordOfferContact(offerId: string, producerId: string, userId: string) {
    if (producerId === userId) return;
    await connection.query(`
        INSERT INTO offer_contacts (offer_id, user_id)
        SELECT id, $3 FROM offers WHERE id = $1 AND "userId" = $2 AND ${publicOfferCondition}
        ON CONFLICT DO NOTHING`, [offerId, producerId, userId]);
}

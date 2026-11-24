import { connection } from '../util/connection';

export async function sendPlatformEmail(email: string, subject: string, text: string, key: string) {
    const { RESEND_API_KEY, EMAIL_FROM } = process.env;
    if (!RESEND_API_KEY || !EMAIL_FROM) throw new Error('EMAIL_NOT_CONFIGURED');
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ from: EMAIL_FROM, to: [email], subject, text }),
    });
    if (!response.ok) throw new Error('EMAIL_DELIVERY_FAILED');
}

// Claim pending messages before contacting the provider. A failed/crashed attempt becomes eligible again.
export async function deliverNotifications() {
    if (!process.env.RESEND_API_KEY?.trim() || !process.env.EMAIL_FROM?.trim()) return;
    const { rows } = await connection.query(`UPDATE moderation_notifications SET next_attempt=now()+interval '5 minutes'
        WHERE id IN (SELECT id FROM moderation_notifications WHERE emailed_at IS NULL AND next_attempt<=now()
        ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING id,email,message`);
    await Promise.all(rows.map(async row => {
        try {
            await sendPlatformEmail(row.email, 'Aviso de moderação | RedeCamarão', row.message, 'moderation-' + row.id);
            await connection.query('UPDATE moderation_notifications SET emailed_at=now() WHERE id=$1', [row.id]);
        } catch { console.error('Aviso de moderação pendente de entrega por e-mail.'); }
    }));
}

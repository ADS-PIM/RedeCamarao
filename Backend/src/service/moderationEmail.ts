import { createHmac, randomInt, randomUUID } from 'node:crypto';
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

function digest(challenge: string, value: string) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_NOT_CONFIGURED');
    return createHmac('sha256', secret).update(challenge + ':' + value).digest('hex');
}

export async function beginAdminLogin(admin: { id: string; email: string; password: string }) {
    const challenge = randomUUID();
    const code = randomInt(1000000).toString().padStart(6, '0');
    await connection.query(`INSERT INTO admin_login_codes (admin_id, challenge, digest, email, password_stamp, expires_at)
        VALUES ($1,$2,$3,$4,$5,now()+interval '10 minutes')
        ON CONFLICT (admin_id) DO UPDATE SET challenge=excluded.challenge, digest=excluded.digest,
        email=excluded.email, password_stamp=excluded.password_stamp, expires_at=excluded.expires_at, attempts=0`,
        [admin.id, challenge, digest(challenge, code), admin.email, digest(challenge, admin.password)]);
    await sendPlatformEmail(admin.email, 'Código de acesso administrativo | RedeCamarão',
        'Seu código de acesso é ' + code + '. Ele é válido por 10 minutos.', challenge);
    return challenge;
}

export async function finishAdminLogin(challenge: string, code: string) {
    if (!/^[0-9a-f-]{36}$/.test(challenge) || !/^\d{6}$/.test(code)) return null;
    const db = await connection.connect();
    try {
        await db.query('BEGIN');
        const { rows } = await db.query(`UPDATE admin_login_codes c SET attempts=attempts+1 FROM administrators a
            WHERE c.challenge=$1 AND c.admin_id=a.id AND a.active AND c.email=a.email
            AND c.expires_at>now() AND c.attempts<5
            RETURNING a.id, a.name, a.role, a."hashPassword" AS password, c.password_stamp, c.digest`, [challenge]);
        const admin = rows[0];
        const valid = admin && admin.digest === digest(challenge, code) && admin.password_stamp === digest(challenge, admin.password);
        if (valid) await db.query('DELETE FROM admin_login_codes WHERE challenge=$1', [challenge]);
        await db.query('COMMIT');
        return valid ? { id: admin.id as string, name: admin.name as string, role: admin.role as string } : null;
    } catch (error) {
        await db.query('ROLLBACK');
        throw error;
    } finally { db.release(); }
}

// Claim pending messages before contacting the provider. A failed/crashed attempt becomes eligible again.
export async function deliverNotifications() {
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

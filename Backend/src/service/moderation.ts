import type { PoolClient } from 'pg';
import { connection } from '../util/connection';
import { imageStorage } from './imageStorage';
import { deliverNotifications } from './moderationEmail';

export class ModerationError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export const actions = {
    disable: 'Oferta desativada', enable: 'Oferta reativada', remove: 'Oferta excluída',
    ban: 'Conta banida', restore: 'Conta reativada',
    suspend: 'Conta suspensa', review: 'Denúncia em análise', archive: 'Denúncia arquivada',
} as const;
type Action = keyof typeof actions;
export const reportCategories = ['Possível fraude', 'Preço divergente', 'Produto não entregue', 'Anúncio duplicado', 'Conteúdo inadequado', 'Outro'];
const offerActions: Action[] = ['disable', 'enable', 'remove'];
const accountActions: Action[] = ['ban', 'restore', 'suspend'];
export function requiredText(input: unknown, max: number, label: string) {
    if (typeof input !== 'string' || !input.trim() || input.trim().length > max)
        throw new ModerationError(400, 'Confira o campo ' + label + '.');
    return input.trim();
}
function conflict(message: string): never { throw new ModerationError(409, message); }

export async function transaction<T>(run: (db: PoolClient) => Promise<T>) {
    const db = await connection.connect();
    try {
        await db.query('BEGIN');
        const result = await run(db);
        await db.query('COMMIT');
        return result;
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
}

export async function moderate(actorId: string, input: Record<string, unknown>) {
    if (!input || typeof input.action !== 'string' || !Object.hasOwn(actions, input.action))
        throw new ModerationError(400, 'Ação inválida.');
    const action = input.action as Action;
    const reason = requiredText(input.reason, 140, 'motivo');
    const justification = requiredText(input.justification, 2000, 'justificativa');
    const fromReport = input.reportId != null;
    const note = fromReport ? requiredText(input.note, 2000, 'observação interna') : null;
    if (action === 'remove' && input.confirmation !== 'EXCLUIR' || action === 'ban' && input.confirmation !== 'BANIR')
        throw new ModerationError(400, 'Digite a palavra de confirmação.');
    if (fromReport && !['review','archive','ban','disable'].includes(action) || !fromReport && ['review','archive'].includes(action))
        throw new ModerationError(400, 'Ação incompatível com a denúncia.');
    const images = await transaction(async db => {
        const actor = (await db.query('SELECT name,role FROM administrators WHERE id=$1 AND active FOR SHARE',[actorId])).rows[0];
        if (!actor || actor.role !== 'SUPER_ADMIN' && (actor.role !== 'ADMIN' || accountActions.includes(action) || action === 'remove'))
            throw new ModerationError(403, 'Sua função não permite esta ação.');
        let report;
        if (fromReport) {
            if (!/^\d{1,18}$/.test(String(input.reportId))) throw new ModerationError(400,'Denúncia inválida.');
            report = (await db.query('SELECT * FROM moderation_reports WHERE id=$1 FOR UPDATE',[input.reportId])).rows[0];
            if (!report || report.status === 'RESOLVED' || action === 'review' && report.status !== 'OPEN') conflict('Esta denúncia já foi processada. Atualize a fila.');
        }
        const target = fromReport ? (offerActions.includes(action) ? report.offer_id : report.account_id) : requiredText(input.targetId,36,'referência');
        let offerId: string | null = report?.offer_id ?? null;
        let accountId = report?.account_id ?? target;
        const description = actions[action];
        let offer;
        if (offerActions.includes(action)) {
            offerId = target;
            const owner = (await db.query('SELECT "userId" FROM offers WHERE id=$1',[target])).rows[0];
            if (!owner) throw new ModerationError(404,'Oferta não encontrada.');
            accountId = owner.userId;
        }
        const account = (await db.query('SELECT id,email,account_status FROM users WHERE id=$1 FOR UPDATE',[accountId])).rows[0];
        const removed: string[] = [];
        let reference = 'DN-' + String(report?.id).padStart(4,'0');
        if (offerActions.includes(action)) {
            offer = (await db.query('SELECT admin_disabled FROM offers WHERE id=$1 FOR UPDATE',[offerId])).rows[0];
            if (!offer) throw new ModerationError(404,'Oferta não encontrada.');
            reference = 'OF-' + target.slice(0,8).toUpperCase();
            if (action === 'remove') {
                removed.push(...(await db.query('SELECT "imageUrl" FROM "offerPhotos" WHERE "offerId"=$1',[offerId])).rows.map(r => r.imageUrl));
                await db.query('DELETE FROM offers WHERE id=$1',[offerId]);
            } else {
                if (offer.admin_disabled === (action === 'disable')) conflict('A oferta já está nesse estado.');
                if (action === 'enable' && account.account_status !== 'ACTIVE') conflict('Reative a conta antes de reativar a oferta.');
                await db.query('UPDATE offers SET admin_disabled=$2 WHERE id=$1',[offerId,action==='disable']);
            }
        } else if (accountActions.includes(action)) {
            if (!account) throw new ModerationError(404,'Conta não encontrada.');
            reference = 'CT-' + accountId.slice(0,8).toUpperCase();
            const allowed: Record<string,string[]> = { ban:['ACTIVE','SUSPENDED'], restore:['BANNED','SUSPENDED'], suspend:['ACTIVE'] };
            if (!allowed[action].includes(account.account_status)) conflict('A situação da conta mudou. Atualize a lista.');
            const status = action === 'ban' ? 'BANNED' : action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
            await db.query('UPDATE users SET account_status=$2 WHERE id=$1',[accountId,status]);
            if (status !== 'ACTIVE') {
                await db.query('UPDATE offers SET admin_disabled=true WHERE "userId"=$1 AND NOT admin_disabled',[accountId]);
                await db.query('DELETE FROM user_refresh_tokens WHERE "userId"=$1',[accountId]);
            }
        }
        if (report) await db.query('UPDATE moderation_reports SET status=$2,assignee=$3 WHERE id=$1',
            [report.id, action === 'review' ? 'REVIEW' : 'RESOLVED', actor.name]);
        await db.query(`INSERT INTO moderation_history(actor_id,actor,action,reference,account_id,offer_id,report_id,reason,justification,internal_note)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[actorId,actor.name,description,reference,accountId,offerId,report?.id,reason,justification,note]);
        if (account && action !== 'review') await db.query('INSERT INTO moderation_notifications(user_id,email,message) VALUES ($1,$2,$3)',
            [accountId,account.email,description + ' · ' + reference + '\n' + reason + '\n' + justification]);
        return removed;
    });
    await imageStorage.removeUnused(images);
    await deliverNotifications().catch(() => console.error('Avisos de moderação aguardam envio.'));
}

export async function submitReport(userId: string, input: Record<string, unknown>) {
    const category = requiredText(input?.category,100,'motivo');
    if (!reportCategories.includes(category)) throw new ModerationError(400,'Motivo inválido.');
    const narrative = requiredText(input.narrative,2000,'relato');
    const files = input.files ?? [];
    if (!Array.isArray(files) || files.length > 2) throw new ModerationError(400,'Envie até dois anexos.');
    const evidence = files.map(file => {
        const name = requiredText(file?.name,150,'nome do arquivo');
        if (typeof file.data !== 'string' || file.data.length > 2800000) throw new ModerationError(400,'Arquivo muito grande.');
        const bytes = Buffer.from(file.data,'base64');
        const mime = bytes.subarray(0,5).toString() === '%PDF-' ? 'application/pdf'
            : bytes.subarray(0,8).toString('hex') === '89504e470d0a1a0a' ? 'image/png'
            : bytes.subarray(0,3).toString('hex') === 'ffd8ff' ? 'image/jpeg' : '';
        if (!mime || bytes.length > 2*1024*1024) throw new ModerationError(400,'Use PDF, PNG ou JPEG de até 2 MB.');
        return { name, mime, bytes };
    });
    return transaction(async db => {
        const id = requiredText(input.offerId ?? input.accountId,36,'referência');
        const target = input.offerId ? (await db.query(`SELECT o.id,o.title,u.id AS owner,u.name FROM offers o JOIN users u ON u.id=o."userId"
            WHERE o.id=$1 AND NOT o.admin_disabled AND o.status='ATIVO' AND u.account_status='ACTIVE'
            AND CURRENT_DATE BETWEEN o.start_availability_date AND o.end_availability_date FOR SHARE`,[id])).rows[0]
            : (await db.query("SELECT id AS owner,name FROM users WHERE id=$1 AND user_type='PRODUCER' AND account_status='ACTIVE' FOR SHARE",[id])).rows[0];
        if (!target || target.owner === userId) throw new ModerationError(400,'Esta publicação ou conta não pode ser denunciada.');
        const { rows } = await db.query(`INSERT INTO moderation_reports(offer_id,offer_title,account_id,account_name,reporter_id,reporter_name,category,narrative)
            SELECT $1,$2,$3,$4,id,name,$6,$7 FROM users WHERE id=$5 AND account_status='ACTIVE' RETURNING id`,
            [target.id,target.title,target.owner,target.name,userId,category,narrative]);
        if (!rows.length) throw new ModerationError(403,'Acesso indisponível.');
        for (const file of evidence) await db.query('INSERT INTO moderation_evidence(report_id,name,mime,content) VALUES ($1,$2,$3,$4)',[rows[0].id,file.name,file.mime,file.bytes]);
        return rows[0];
    });
}

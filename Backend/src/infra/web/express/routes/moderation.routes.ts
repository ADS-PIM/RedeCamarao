import { Router, type Response, type RequestHandler } from 'express';
import type { AuthRequest } from '../../../../../authMiddleware';
import { connection } from '../../../../util/connection';
import { summary, overview, listing, filterOptions } from '../../../../service/moderationLists';
import { isSuperAdmin } from '../../../../../authMiddleware';
import { controllers } from '../../../../config/composition_root';
import { moderate, ModerationError, submitReport } from '../../../../service/moderation';
import type { UserAuthRequest } from '../../../../../userAuthMiddleware';

const router = Router();
function endpoint(run: (req: AuthRequest, res: Response) => Promise<unknown>): RequestHandler {
    return async (req,res) => {
        res.set('Cache-Control','no-store');
        try { await run(req,res); }
        catch (error) {
            if (error instanceof ModerationError) { res.status(error.status).json({ error:error.message }); return; }
            console.error('Falha na operação de moderação', error instanceof Error ? error.name : '');
            res.status(500).json({ error:'Não foi possível concluir a operação. Atualize a página e tente novamente.' });
        }
    };
}
router.get('/summary',endpoint(async (req,res)=>res.json(await summary(req.admin?.role==='SUPER_ADMIN'))));
router.get('/overview',endpoint(async (req,res)=>res.json(await overview(req.admin?.role==='SUPER_ADMIN'))));
router.get('/filters',endpoint(async (_req,res)=>res.json(await filterOptions())));
router.get('/lists/:section',endpoint(async (req,res)=>res.json(await listing(String(req.params.section),req.query,req.admin?.role==='SUPER_ADMIN'))));
router.post('/actions',endpoint(async (req,res)=>{ await moderate(req.admin!.adminId!,req.body); res.sendStatus(204); }));
router.get('/reports/:id/context',endpoint(async (req,res)=>{
    const id=String(req.params.id);
    if (!/^\d{1,18}$/.test(id)) throw new ModerationError(400,'Denúncia inválida.');
    const {rows}=await connection.query(`SELECT
        CASE WHEN a.id IS NOT NULL THEN json_build_object('name',a.name,'profile',a.profile,'status',a.status,
          'location',a.location,'activeOffers',a."activeOffers",'code',a.code) END AS account,
        CASE WHEN o.id IS NOT NULL THEN row_to_json(o) END AS offer,
        (SELECT json_build_object('action',h.action,'actor',h.actor,'reason',h.reason,
            'justification',h.justification,'note',h.internal_note,'createdAt',h.created_at)
         FROM moderation_history h WHERE h.report_id=r.id ORDER BY h.id DESC LIMIT 1) AS decision
        FROM moderation_reports r LEFT JOIN admin_account_list a ON a.id=r.account_id
        LEFT JOIN admin_offer_list o ON o.id=r.offer_id WHERE r.id=$1`,[id]);
    if (!rows.length) throw new ModerationError(404,'Denúncia não encontrada.');
    res.json(rows[0]);
}));
router.get('/evidence/:id',endpoint(async (req,res)=>{
    const id=String(req.params.id);
    if (!/^\d{1,18}$/.test(id)) throw new ModerationError(400,'Anexo inválido.');
    const row=(await connection.query('SELECT name,mime,content FROM moderation_evidence WHERE id=$1',[id])).rows[0];
    if (!row) throw new ModerationError(404,'Anexo não encontrado.');
    res.attachment(row.name).type(row.mime).set('X-Content-Type-Options','nosniff').send(row.content);
}));
router.post('/team/:id',isSuperAdmin,(req,res)=>controllers.adminController.update(req,res,true));
export const createReport = endpoint(async (req: UserAuthRequest,res)=>res.status(201).json(await submitReport(req.user!.userId,req.body)));
export const myNotifications = endpoint(async (req: UserAuthRequest,res)=>{
    const {rows}=await connection.query('SELECT id,message,created_at AS "createdAt" FROM moderation_notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 50',[req.user!.userId]);
    res.json(rows);
});
export default router;

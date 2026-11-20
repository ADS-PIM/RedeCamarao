import { Router, type Response, type RequestHandler } from 'express';
import type { AuthRequest } from '../../../../../authMiddleware';
import { connection } from '../../../../util/connection';
import { summary, listing, filterOptions } from '../../../../service/moderationLists';
import { moderate, ModerationError, requiredText, submitReport, transaction } from '../../../../service/moderation';
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
router.get('/filters',endpoint(async (_req,res)=>res.json(await filterOptions())));
router.get('/lists/:section',endpoint(async (req,res)=>res.json(await listing(String(req.params.section),req.query,req.admin?.role==='SUPER_ADMIN'))));
router.post('/actions',endpoint(async (req,res)=>{ await moderate(req.admin!.adminId!,req.body); res.sendStatus(204); }));
router.get('/evidence/:id',endpoint(async (req,res)=>{
    const id=String(req.params.id);
    if (!/^\d{1,18}$/.test(id)) throw new ModerationError(400,'Anexo inválido.');
    const row=(await connection.query('SELECT name,mime,content FROM moderation_evidence WHERE id=$1',[id])).rows[0];
    if (!row) throw new ModerationError(404,'Anexo não encontrado.');
    res.attachment(row.name).type(row.mime).set('X-Content-Type-Options','nosniff').send(row.content);
}));
router.post('/team/:id',endpoint(async (req,res)=>{
    if (req.admin?.role !== 'SUPER_ADMIN') throw new ModerationError(403,'Acesso restrito à gestão.');
    const id=String(req.params.id);
    const { role,active,justification }=req.body ?? {};
    if (id===req.admin.adminId || !['SUPER_ADMIN','ADMIN'].includes(role) || typeof active!=='boolean')
        throw new ModerationError(400,'Selecione outro membro e uma função válida.');
    const why=requiredText(justification,2000,'justificativa');
    await transaction(async db=>{
        const members=(await db.query('SELECT id,name,role,active FROM administrators WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[id,req.admin!.adminId]])).rows;
        const actor=members.find(a=>a.id===req.admin!.adminId);
        const target=members.find(a=>a.id===id);
        if (!actor?.active || actor.role!=='SUPER_ADMIN') throw new ModerationError(403,'Permissão insuficiente.');
        if (!target) throw new ModerationError(404,'Membro não encontrado.');
        await db.query('UPDATE administrators SET role=$2,active=$3 WHERE id=$1',[id,role,active]);
        await db.query('DELETE FROM refresh_tokens WHERE "adminId"=$1',[id]);
        await db.query(`INSERT INTO moderation_history(actor_id,actor,action,reference,reason,justification)
            VALUES ($1,$2,'Permissão alterada',$3,$4,$5)`,[actor.id,actor.name,target.name, (role==='ADMIN'?'Moderador':'Administrador')+' · '+(active?'Ativo':'Inativo'),why]);
    });
    res.sendStatus(204);
}));
export const createReport = endpoint(async (req: UserAuthRequest,res)=>res.status(201).json(await submitReport(req.user!.userId,req.body)));
export const myNotifications = endpoint(async (req: UserAuthRequest,res)=>{
    const {rows}=await connection.query('SELECT id,message,created_at AS "createdAt" FROM moderation_notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 50',[req.user!.userId]);
    res.json(rows);
});
export default router;

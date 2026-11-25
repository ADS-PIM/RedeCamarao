import { connection } from '../util/connection';
import { ModerationError } from './moderation';

type Filters = Record<string, unknown>;
const reportPriority = "category IN ('Possível fraude','Produto não entregue')";
const reportsQuery = `(SELECT r.id::text, 'DN-' || lpad(r.id::text,greatest(4,length(r.id::text)), '0') AS code,
    r.category, r.status, r.narrative, r.created_at AS "createdAt", r.reporter_name AS reporter, r.assignee,
    r.offer_id AS "offerId", r.offer_title AS "offerTitle", r.account_id AS "accountId", r.account_name AS "accountName",
    r.${reportPriority} AS priority,
    (SELECT count(*)::int FROM moderation_reports x WHERE x.account_id=r.account_id AND x.offer_id IS NOT DISTINCT FROM r.offer_id) AS "reportCount",
    coalesce((SELECT json_agg(json_build_object('id',e.id::text,'name',e.name) ORDER BY id) FROM moderation_evidence e WHERE e.report_id=r.id),'[]') AS files
    FROM moderation_reports r) records`;
const historyQuery = `(SELECT id,actor,actor_id AS "actorId",action,reference,reason,justification,internal_note AS note,
    account_id AS "accountId",offer_id AS "offerId",report_id::text AS "reportId",created_at AS "createdAt" FROM moderation_history) records`;

export async function summary(superAdmin: boolean) {
    const counts = async (table: string) => Object.fromEntries((await connection.query('SELECT status,count(*)::int AS n FROM '+table+' GROUP BY status')).rows.map(r => [r.status,r.n]));
    const [offers,reports,accounts,team] = await Promise.all([counts('admin_offer_list'),counts('moderation_reports'),
        superAdmin ? counts('admin_account_list') : {},connection.query('SELECT role,count(*)::int AS n FROM administrators WHERE active GROUP BY role')]);
    return { offers,reports,accounts,emailConfigured:Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()),team:Object.fromEntries(team.rows.map(r=>[r.role,r.n])) };
}

export async function overview(superAdmin: boolean) {
    const [reports, accounts, offers, reviews, pendingReports] = await Promise.all([
        connection.query(`SELECT count(*)::int AS "highPriority"
            FROM moderation_reports WHERE status <> 'RESOLVED' AND ${reportPriority}`),
        superAdmin ? connection.query(`SELECT
            (count(*) FILTER (WHERE "createdAt" >= now() - interval '30 days'))::int AS "newAccounts",
            (count(*) FILTER (WHERE user_type = 'PRODUCER' AND account_status = 'ACTIVE'))::int AS producers,
            (count(*) FILTER (WHERE user_type = 'PRODUCER' AND account_status = 'ACTIVE' AND verified))::int AS verified
            FROM users`) : null,
        connection.query(`SELECT count(*)::int AS total,
            (count(*) FILTER (WHERE NOT EXISTS (
                SELECT 1 FROM moderation_reports r WHERE r.offer_id = o.id AND r.created_at >= now() - interval '30 days'
            )))::int AS clean FROM admin_offer_list o WHERE o.status = 'ATIVO'`),
        connection.query(`WITH first_reviews AS (
            SELECT report_id, min(created_at) AS reviewed_at FROM moderation_history
            WHERE report_id IS NOT NULL GROUP BY report_id
            HAVING min(created_at) >= now() - interval '30 days'
        )
        SELECT count(*)::int AS total,
            (count(*) FILTER (WHERE f.reviewed_at <= r.created_at + interval '24 hours'))::int AS "onTime"
        FROM first_reviews f JOIN moderation_reports r ON r.id = f.report_id`),
        listing('reports', { status: 'PENDING', size: '3' }, superAdmin),
    ]);
    return {
        highPriorityReports: reports.rows[0].highPriority,
        accounts: accounts?.rows[0] ?? null,
        offers: offers.rows[0],
        reviews: reviews.rows[0],
        pendingReports: pendingReports.rows.map(({ id, code, category, status, accountName, offerTitle, priority, createdAt }) =>
            ({ id, code, category, status, accountName, offerTitle, priority, createdAt })),
    };
}

export async function listing(section: string, query: Filters, superAdmin: boolean) {
    const args: unknown[] = [];
    const conditions: string[] = [];
    function param(value: unknown) { args.push(value); return '$' + args.length; }
    function eq(column: string, value: unknown) { if (typeof value === 'string' && value) conditions.push(column+'='+param(value)); }
    function search(columns: string[], value: unknown) {
        if (typeof value !== 'string' || !value.trim()) return;
        const key = param('%'+value.trim().slice(0,160).replace(/[\\%_]/g,'\\$&')+'%');
        conditions.push('('+columns.map(c=>c+' ILIKE '+key).join(' OR ')+')');
    }
    let source: string;
    let order = '"createdAt" DESC,id DESC';
    if (section === 'offers') {
        source='admin_offer_list'; eq('status',query.status); eq('type',query.category); eq('id',query.id);
        search(['title','id','code','producer'],query.q); search(['location'],query.location);
        if (query.reported === 'true') conditions.push('"openReports">0');
    } else if (section === 'accounts') {
        if (!superAdmin) throw new ModerationError(403,'A gestão de contas é exclusiva da administração.');
        source='admin_account_list'; eq('status',query.status); eq('profile',query.profile); eq('id',query.id);
        const documentQuery = typeof query.q === 'string' && /^[\d./ -]+$/.test(query.q) && /\d/.test(query.q);
        if (documentQuery) search(['document'],String(query.q).replace(/\D/g,''));
        else search(['name','email','code','document'],query.q);
        search(['location'],query.location);
        if (query.sort === 'oldest') order='"createdAt" ASC,id ASC';
    } else if (section === 'reports') {
        source=reportsQuery; eq('"offerId"',query.offerId); eq('id',query.id);
        if (query.status === 'PRIORITY' || query.status === 'PENDING') conditions.push("status <> 'RESOLVED'");
        else eq('status',query.status);
        if (query.status === 'PRIORITY') conditions.push('priority');
        if (query.sort !== 'recent') order='priority DESC,'+order;
    } else if (section === 'history') {
        source=historyQuery; eq('action',query.action); eq('"actorId"',query.actor);
        eq('"accountId"',query.accountId); search(['reference','"offerId"','"accountId"'],query.q);
        if (['7','30','90'].includes(String(query.days))) conditions.push('"createdAt" >= now() - '+param(query.days)+"::int * interval '1 day'");
    } else throw new ModerationError(404,'Lista não encontrada.');
    const where = conditions.length ? ' WHERE '+conditions.join(' AND ') : '';
    const size = Math.min(100, Math.max(1,Number(query.size)||6));
    const page = Math.min(100000000,Math.max(1,Number(query.page)||1));
    if (!Number.isInteger(size) || !Number.isInteger(page)) throw new ModerationError(400,'Paginação inválida.');
    const count = await connection.query('SELECT count(*)::int AS total FROM '+source+where,args);
    const total = count.rows[0].total as number;
    const current = Math.min(page, Math.max(1, Math.ceil(total / size)));
    const rows = await connection.query('SELECT * FROM '+source+where+' ORDER BY '+order+' LIMIT $'+(args.length+1)+' OFFSET $'+(args.length+2),[...args,size,(current-1)*size]);
    return { rows:rows.rows,total,page:current };
}

export async function filterOptions() {
    const [categories,actors,actions] = await Promise.all([
        connection.query('SELECT DISTINCT type FROM offers WHERE type IS NOT NULL ORDER BY type'),
        connection.query('SELECT DISTINCT ON (actor_id) actor_id AS id, actor AS name FROM moderation_history ORDER BY actor_id,moderation_history.id DESC'),
        connection.query('SELECT DISTINCT action FROM moderation_history ORDER BY action'),
    ]);
    return { categories:categories.rows.map(r=>r.type), actors:actors.rows, actions:actions.rows.map(r=>r.action) };
}

ALTER TABLE users ADD COLUMN account_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE','PENDING','SUSPENDED','BANNED')),
    ADD COLUMN verified boolean NOT NULL DEFAULT false;
ALTER TABLE offers ADD COLUMN admin_disabled boolean NOT NULL DEFAULT false;

CREATE TABLE moderation_reports (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    offer_id char(36), offer_title text, account_id char(36) NOT NULL, account_name text NOT NULL,
    reporter_id char(36) NOT NULL, reporter_name text NOT NULL,
    category text NOT NULL, narrative text NOT NULL,
    status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','REVIEW','RESOLVED')),
    assignee text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_reports_offer ON moderation_reports (offer_id, status);
CREATE INDEX moderation_reports_queue ON moderation_reports (status, created_at DESC);
CREATE TABLE moderation_evidence (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id bigint NOT NULL REFERENCES moderation_reports(id) ON DELETE CASCADE,
    name text NOT NULL, mime text NOT NULL, content bytea NOT NULL
);
CREATE TABLE moderation_history (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id char(36) NOT NULL, actor text NOT NULL, action text NOT NULL,
    reference text NOT NULL, account_id char(36), offer_id char(36), report_id bigint,
    reason text NOT NULL, justification text NOT NULL, internal_note text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_history_date ON moderation_history (created_at DESC, id DESC);
CREATE FUNCTION protect_moderation_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'O histórico administrativo é somente para leitura';
END $$;
CREATE TRIGGER moderation_history_readonly BEFORE UPDATE OR DELETE OR TRUNCATE ON moderation_history
    FOR EACH STATEMENT EXECUTE FUNCTION protect_moderation_history();

CREATE TABLE moderation_notifications (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id char(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    emailed_at timestamptz, next_attempt timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW admin_offer_list AS
SELECT o.id, 'OF-' || upper(left(o.id,8)) AS code, o.title, o.description, o.type, o.location, o.price, o.weight,
    o."createdAt", u.name AS producer, u.id AS "accountId", u.account_status AS "accountStatus",
    coalesce(r.open,0)::int AS "openReports", coalesce(r.total,0)::int AS "totalReports",
    CASE WHEN o.admin_disabled THEN 'DISABLED' WHEN r.review THEN 'REVIEW'
         WHEN o.status = 'ATIVO' AND o.end_availability_date < CURRENT_DATE THEN 'EXPIRADO'
         ELSE o.status END AS status
FROM offers o JOIN users u ON u.id=o."userId"
LEFT JOIN (SELECT offer_id, count(*) AS total, count(*) FILTER (WHERE status <> 'RESOLVED') AS open,
    bool_or(status='REVIEW') AS review FROM moderation_reports GROUP BY offer_id) r ON r.offer_id=o.id;

CREATE VIEW admin_account_list AS
SELECT u.id, 'CT-' || upper(left(u.id,8)) AS code, u.name, u.email, trim(u."CPF_CNPJ") AS document,
    u.user_type AS profile, u.account_status AS status, u.verified, u.location, u.phone, u."createdAt",
    (SELECT count(*)::int FROM offers o WHERE o."userId"=u.id AND o.status='ATIVO'
        AND NOT o.admin_disabled AND CURRENT_DATE BETWEEN o.start_availability_date AND o.end_availability_date) AS "activeOffers"
FROM users u;


CREATE TABLE admin_login_codes (
    admin_id char(36) PRIMARY KEY REFERENCES administrators(id) ON DELETE CASCADE,
    challenge uuid UNIQUE NOT NULL, digest text NOT NULL, email text NOT NULL, password_stamp text NOT NULL,
    expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0
);

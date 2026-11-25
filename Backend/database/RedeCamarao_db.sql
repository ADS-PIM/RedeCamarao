CREATE TABLE "users" (
    "id" CHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "hashPassword" VARCHAR(255) NOT NULL,
    "CPF_CNPJ" CHAR(14) NOT NULL,
    "user_type" VARCHAR(20) CHECK ("user_type" IN ('PRODUCER', 'BUYER')) NOT NULL,
    "description" VARCHAR(2000) DEFAULT NULL,
    "location" VARCHAR(255) DEFAULT NULL,
    "phone" VARCHAR(20) DEFAULT NULL,
    "businessHours" VARCHAR(255) DEFAULT NULL,
    "profilePicture" VARCHAR(2048) DEFAULT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    CONSTRAINT "users_unique" UNIQUE ("email")
);

CREATE TABLE user_refresh_tokens (
    id char(36) not null,
    "userId" char(36) not null,
    "tokenHash" char(64) not null,
    "createdAt" TIMESTAMPTZ not null default current_timestamp,
    "expiresAt" TIMESTAMPTZ not null,
    "revokedAt" TIMESTAMPTZ default NULL,
    primary key (id),
    CONSTRAINT user_refresh_tokens_hash_unique UNIQUE ("tokenHash"),
    constraint user_refresh_tokens_user_FK foreign key ("userId") references users(id)
    on update cascade on delete cascade
);

create table "offers" (
    "id" char(36) not null,
    "userId" char(36) not null,
    "title" varchar(255) not null,
    "description" varchar(1000) not null default '',
    "type" varchar(255) default null,
    "size" varchar(255) not null,
    "price" decimal(10,2) not null,
    "weight" decimal(11,3) not null default 0,
    "max_quantity" decimal(11,3) not null,
    "min_quantity" decimal(11,3) not null default 0,
    "location" varchar(255) not null,
    "start_availability_date" date not null,
    "end_availability_date" date not null,
    "status" VARCHAR(20) CHECK ("status" IN ('ATIVO', 'PAUSADO', 'VENDIDO', 'CANCELADO', 'EXPIRADO', 'RASCUNHO')) not null,
    "createdAt" TIMESTAMPTZ not null default current_timestamp,
    "updatedAt" TIMESTAMPTZ not null default current_timestamp,
    primary key ("id"),
    constraint "offers_users_FK" foreign key ("userId") references "users" ("id") on update cascade on delete cascade
);

create table "offerPhotos" (
    "id" char(36) not null,
    "offerId" char(36) not null,
    "imageUrl" varchar(2048) not null,
    "description" varchar(500) not null default '',
    primary key ("id"),
    constraint "offerPhotos_offers_FK" foreign key ("offerId") references "offers" ("id") on update cascade on delete cascade
);

create table "administrators" (
    "id" char(36) not null,
    "name" varchar(255) not null,
    "email" varchar(320) not null,
    "hashPassword" varchar(255) not null,
    "role" varchar(50) not null,
    "active" boolean not null default true,
    "createdAt" TIMESTAMPTZ not null default current_timestamp,
    "profilePicture" varchar(2048) default null,
    primary key ("id"),
    CONSTRAINT "administrators_unique" UNIQUE ("email")
);

create table "refresh_tokens" (
    "id" char(36) not null,
    "adminId" char(36) not null,
    "tokenHash" char(64) not null,
    "createdAt" TIMESTAMPTZ not null default current_timestamp,
    "expiresAt" TIMESTAMPTZ not null,
    "revokedAt" TIMESTAMPTZ default null,
    primary key ("id"),
    constraint "refreshTokens_administrators_FK" foreign key ("adminId") references "administrators" ("id") on update cascade
);

create table "password_reset_tokens" (
    "adminId" char(36) not null,
    "tokenHash" char(64) not null,
    "passwordHashAtRequest" varchar(255) not null,
    "emailAtRequest" varchar(320) not null,
    "createdAt" TIMESTAMPTZ not null default current_timestamp,
    "expiresAt" TIMESTAMPTZ not null,
    primary key ("adminId"),
    CONSTRAINT "password_reset_tokens_hash_unique" UNIQUE ("tokenHash"),
    constraint "password_reset_tokens_admin_FK" foreign key ("adminId") references "administrators" ("id") on update cascade on delete cascade
);

create table "rate_limit_buckets" (
    "bucket_key" char(64) not null,
    "tokens" DOUBLE PRECISION not null,
    "updated_at_ms" bigint not null,
    "expires_at_ms" bigint not null,
    primary key ("bucket_key")
);

CREATE UNIQUE INDEX users_email_case_insensitive ON users (LOWER(email));
CREATE UNIQUE INDEX administrators_email_case_insensitive ON administrators (LOWER(email));
CREATE INDEX offers_user_id_idx ON offers ("userId");
CREATE INDEX offer_photos_offer_id_idx ON "offerPhotos" ("offerId");
CREATE INDEX user_refresh_tokens_user_id_idx ON user_refresh_tokens ("userId");
CREATE INDEX refresh_tokens_admin_id_idx ON refresh_tokens ("adminId");
CREATE INDEX rate_limit_buckets_expires_at_ms_idx ON rate_limit_buckets (expires_at_ms);

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE users ADD COLUMN account_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE','SUSPENDED','BANNED')),
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

CREATE TABLE offer_views (
    offer_id char(36) PRIMARY KEY REFERENCES offers(id) ON DELETE CASCADE,
    views bigint NOT NULL DEFAULT 0
);
CREATE TABLE offer_contacts (
    offer_id char(36) REFERENCES offers(id) ON DELETE CASCADE,
    user_id char(36) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (offer_id, user_id)
);

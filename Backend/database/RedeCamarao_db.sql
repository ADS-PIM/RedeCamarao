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
    "weight" decimal(10,2) not null default 0,
    "max_quantity" decimal(10,2) not null,
    "min_quantity" decimal(10,2) not null default 0,
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
    "tokenHash" varchar(281) not null,
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

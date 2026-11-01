create table `users` (
    `id` char(36) not null,
    `name` varchar(255) not null,
    `email` varchar(320) not null,
    `hashPassword` varchar(255) not null,
    `CPF_CNPJ` char(14) not null default '',
    `user_type` enum('PRODUTOR', 'COMPRADOR') not null,
    `createdAt` timestamp not null default current_timestamp,
    `updatedAt` timestamp not null default current_timestamp on update current_timestamp,
    `description` varchar(2000) not null default '',
    `location` varchar(255) not null default '',
    `WhatsApp` varchar(20) not null default '',
    `businessHours` varchar(255) not null default '',
    primary key (`id`),
    unique key `users_unique` (`email`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

CREATE TABLE user_refresh_tokens (
    id char(36) not null,
    userId char(36) not null,
    tokenHash char(64) not null,
    createdAt timestamp not null default current_timestamp,
    expiresAt datetime not null,
    revokedAt datetime default NULL,
    primary key (id),
    unique key user_refresh_tokens_hash_unique (tokenHash),
    key user_refresh_tokens_user_FK (userId),
    constraint user_refresh_tokens_user_FK foreign key (userId) references users(id)
    on update cascade on delete cascade
) ENGINE = InnoDB default charSET = utf8mb4 collate = utf8mb4_general_ci;

create table `offers` (
    `id` char(36) not null,
    `userId` char(36) not null,
    `title` varchar(255) not null,
    `description` varchar(1000) not null default '',
    `size` varchar(255) not null,
    `price` decimal(10,2) not null,
    `weight` decimal(10,2) not null default 0,
    `max_quantity` decimal(10,2) not null,
    `min_quantity` decimal(10,2) not null default 0,
    `location` varchar(255) not null,
    `start_availability_date` date not null,
    `end_availability_date` date not null,
    `status` enum('ATIVO', 'PAUSADO', 'VENDIDO', 'CANCELADO') not null,
    `createdAt` timestamp not null default current_timestamp,
    `updatedAt` timestamp not null default current_timestamp on update current_timestamp,
    primary key (`id`),
    key `offers_users_FK` (`userId`),
    constraint `offers_users_FK` foreign key (`userId`) references `users` (`id`) on update cascade
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `offerPhotos` (
    `id` char(36) not null,
    `offerId` char(36) not null,
    `imageUrl` varchar(2048) not null,
    `description` varchar(500) not null default '',
    primary key (`id`),
    key `offerPhotos_offers_FK` (`offerId`),
    constraint `offerPhotos_offers_FK` foreign key (`offerId`) references `offers` (`id`) on update cascade on delete cascade
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `administrators` (
    `id` char(36) not null,
    `name` varchar(255) not null,
    `email` varchar(320) not null,
    `hashPassword` varchar(255) not null,
    `role` varchar(50) not null,
    `active` boolean not null default true,
    `createdAt` timestamp not null default current_timestamp,
    `profilePicture` varchar(2048) default null,
    primary key (`id`),
    unique key `administrators_unique` (`email`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `refresh_tokens` (
    `id` char(36) not null,
    `adminId` char(36) not null,
    `tokenHash` varchar(281) not null,
    `createdAt` timestamp not null default current_timestamp,
    `expiresAt` datetime not null,
    `revokedAt` datetime default null,
    primary key (`id`),
    key `refreshTokens_administrators_FK` (`adminId`),
    constraint `refreshTokens_administrators_FK` foreign key (`adminId`) references `administrators` (`id`) on update cascade
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `password_reset_tokens` (
    `adminId` char(36) not null,
    `tokenHash` char(64) not null,
    `passwordHashAtRequest` varchar(255) not null,
    `emailAtRequest` varchar(320) not null,
    `createdAt` datetime not null default current_timestamp,
    `expiresAt` datetime not null,
    primary key (`adminId`),
    unique key `password_reset_tokens_hash_unique` (`tokenHash`),
    constraint `password_reset_tokens_admin_FK` foreign key (`adminId`) references `administrators` (`id`) on update cascade on delete cascade
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `rate_limit_buckets` (
    `bucket_key` char(64) not null,
    `tokens` double not null,
    `updated_at_ms` bigint not null,
    `expires_at_ms` bigint not null,
    primary key (`bucket_key`),
    key `rate_limit_buckets_expires_at_ms_idx` (`expires_at_ms`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

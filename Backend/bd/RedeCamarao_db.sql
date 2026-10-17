create table `users` (
    `id` char(36) not null,
    `name` varchar(255) not null,
    `email` varchar(320) not null,
    `hashPassword` varchar(255) not null,
    `user_type` enum('PRODUTOR', 'REVENDEDOR', 'COMPRADOR') not null,
    `createdAt` timestamp not null default current_timestamp,
    `updatedAt` timestamp not null default current_timestamp on update current_timestamp,
    primary key (`id`),
    unique key `users_unique` (`email`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `profiles` (
    `id` char(36) not null,
    `userId` char(36) not null,
    `name` varchar(255) not null,
    `location` varchar(255) not null,
    `phone` varchar(20) not null,
    `whatsapp` varchar(20) default null,
    primary key (`id`),
    unique key `profiles_users_unique` (`userId`),
    constraint `profiles_users_FK` foreign key (`userId`) references `users` (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `offers` (
    `id` char(36) not null,
    `userId` char(36) not null,
    `title` varchar(255) not null,
    `description` varchar(1000) default null,
    `type` varchar(255) not null,
    `size` varchar(255) not null,
    `price` decimal(10,2) not null,
    `quantity` decimal(10,2) not null,
    `location` varchar(255) not null,
    `availability_date` date not null,
    `status` enum('ATIVO', 'PAUSADO', 'VENDIDO', 'CANCELADO') not null,
    `createdAt` timestamp not null default current_timestamp,
    `updatedAt` timestamp not null default current_timestamp on update current_timestamp,
    primary key (`id`),
    key `offers_users_FK` (`userId`),
    constraint `offers_users_FK` foreign key (`userId`) references `users` (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `offerPhotos` (
    `id` char(36) not null,
    `offerId` char(36) not null,
    `imageUrl` varchar(2048) not null,
    primary key (`id`),
    key `offerPhotos_offers_FK` (`offerId`),
    constraint `offerPhotos_offers_FK` foreign key (`offerId`) references `offers` (`id`) on delete cascade
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `conversations` (
    `id` char(36) not null,
    `offerId` char(36) not null,
    `buyerId` char(36) not null,
    `advertiserId` char(36) not null,
    `createdAt` timestamp not null default current_timestamp,
    primary key (`id`),
    key `conversations_offers_FK` (`offerId`),
    key `conversations_buyer_FK` (`buyerId`),
    key `conversations_advertiser_FK` (`advertiserId`),
    constraint `conversations_offers_FK` foreign key (`offerId`) references `offers` (`id`),
    constraint `conversations_buyer_FK` foreign key (`buyerId`) references `users` (`id`),
    constraint `conversations_advertiser_FK` foreign key (`advertiserId`) references `users` (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `messages` (
    `id` char(36) not null,
    `conversationId` char(36) not null,
    `senderId` char(36) not null,
    `message` varchar(1500) not null,
    `sentAt` timestamp not null default current_timestamp,
    `read` boolean not null default false,
    primary key (`id`),
    key `messages_conversations_FK` (`conversationId`),
    key `messages_users_FK` (`senderId`),
    constraint `messages_conversations_FK` foreign key (`conversationId`) references `conversations` (`id`) on delete cascade,
    constraint `messages_users_FK` foreign key (`senderId`) references `users` (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `administrators` (
    `id` char(36) not null,
    `name` varchar(255) not null,
    `email` varchar(320) not null,
    `hashPassword` varchar(255) not null,
    `role` enum('ADMIN', 'SUPER_ADMIN') not null,
    `active` boolean not null default true,
    `createdAt` timestamp not null default current_timestamp,
    `profile_picture` varchar(2048) default null,
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
    constraint `refreshTokens_administrators_FK` foreign key (`adminId`) references `administrators` (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;
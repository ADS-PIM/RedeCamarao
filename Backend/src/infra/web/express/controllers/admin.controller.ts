import type { Request, Response } from 'express';
import type { AuthRequest } from '../../../../../authMiddleware';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PasswordCrypto } from '../../../../service/passwordCrypto'
import jwt from 'jsonwebtoken';
import { ModerationError, requiredText } from '../../../../service/moderation';
import { AdminRole } from '../../../../domain/model/admin';

import { AdminCreateDTO } from '../../../../application/dto/adminDTO/AdminCreateDTO';
import { AdminLoginDTO } from '../../../../application/dto/adminDTO/AdminLoginDTO';
import { AdminUpdateDTO } from '../../../../application/dto/adminDTO/AdminUpdateDTO';

import { CreateAdmin } from '../../../../application/usecase/admin/CreateAdminUseCase';
import { DeleteAdmin } from '../../../../application/usecase/admin/DeleteAdminUseCase';
import { SearchAllAdmins } from '../../../../application/usecase/admin/SearchAllAdmins';
import { SearchByEmailAdmin } from '../../../../application/usecase/admin/SearchAdminByEmailUseCase';
import { SearchByIdAdmin } from '../../../../application/usecase/admin/SearchAdminByIdUseCase';
import { SearchPublicById } from '../../../../application/usecase/admin/PublicSearchAdminById';
import { UpdateAdmin } from '../../../../application/usecase/admin/UpdateAdminUseCase';

import { CreateRefreshToken } from '../../../../application/usecase/refresh_token/CreateRefreshTokenUseCase';
import { DeleteByToken } from '../../../../application/usecase/refresh_token/DeleteByTokenUseCase';
import type { AdminRefreshTokenInterface } from '../../../../domain/interfaces/RefreshTokenDAOInterface';

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

const refreshCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/admin'
};

export class AdminController {

    constructor(
        private createAdmin: CreateAdmin,
        private searchByEmailAdmin: SearchByEmailAdmin,
        private searchByIdAdmin: SearchByIdAdmin,
        private searchPublicById: SearchPublicById,
        private createRefreshToken: CreateRefreshToken,
        private rotateRefreshToken: AdminRefreshTokenInterface['rotate'],
        private deleteByToken: DeleteByToken,
        private updateAdmin: UpdateAdmin,
        private deleteAdmin: DeleteAdmin,
        private searchAllAdmins: SearchAllAdmins
    ) {}

    public async register(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const adminCreateDTO = plainToInstance(AdminCreateDTO, req.body);
            const errors = await validate(adminCreateDTO);

            if (errors.length > 0) {
                return res.status(400).json({error: 'Confira o nome, o e-mail, a senha e a função do membro.'});
            }

            if (!req.admin?.adminId) return res.status(401).json({ error: 'Entre com sua conta administrativa.' });
            await this.createAdmin.execute(adminCreateDTO, req.admin.adminId);
            return res.status(201).json({ message: 'Membro da equipe cadastrado.' })
        } catch (error: any) {
            if (String(error.message).includes('FORBIDDEN')) return res.status(403).json({ error: 'Sua função não permite cadastrar membros.' });
            if (String(error.message).includes('Email already registered') || String(error.message).includes('duplicate key'))
                return res.status(409).json({error: 'Este e-mail já pertence a um membro da equipe.'});
            return res.status(500).json({error: 'Não foi possível cadastrar o membro da equipe.'});
        }
    }

    public async login(req: Request, res: Response): Promise<Response> {
        try{
            const adminLoginDTO = plainToInstance(AdminLoginDTO, req.body);
            const errors = await validate(adminLoginDTO);

            if (errors.length > 0) {
                return res.status(400).json({ error: 'Confira o e-mail e a senha.' });
            }

            const admin = await this.searchByEmailAdmin.execute(adminLoginDTO.email);

            if (!admin || !admin.active || !admin.password || !(await PasswordCrypto.verifyPassword(adminLoginDTO.password, admin.password))) {
                return res.status(401).json({error: 'E-mail ou senha incorretos.'});
            }

            const accessSecret = process.env.JWT_ACCESS_SECRET;
            const refreshSecret = process.env.JWT_REFRESH_SECRET;

            if (!accessSecret || !refreshSecret) {
                return res.status(500).json({error: 'JWT secrets are not configured'});
            }

            const accessToken = jwt.sign({ adminId: admin.id, role: admin.role, amr: ['pwd'] }, accessSecret, { expiresIn: '5m' });
            const refreshTokenId = crypto.randomUUID();
            const refreshToken = jwt.sign({ adminId: admin.id, role: admin.role, amr: ['pwd'] }, refreshSecret, { expiresIn: '7d', jwtid: refreshTokenId });
            const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await this.createRefreshToken.execute({ id: refreshTokenId, token: refreshToken, userId: admin.id, expiresAt: refreshExpiresAt });

            res.clearCookie('userRefreshToken', { ...refreshCookieOptions, maxAge: undefined, path: '/users' });
            res.cookie('refreshToken', refreshToken, refreshCookieOptions);
            return res.status(200).json({ accessToken, userId: admin.id, userType: 'ADMIN', name: admin.name, role: admin.role });
        } catch {
            return res.status(503).json({ error: 'Não foi possível entrar agora. Tente novamente.' });
        }
    }

    public async refresh(req: Request, res: Response): Promise<Response> {
        try{
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) return res.status(401).json({ message: 'Refresh token is missing' });

            if (!process.env.JWT_REFRESH_SECRET) {
                throw new Error('JWT refresh secret is not configured');
            }

            let payload: string | jwt.JwtPayload;
            try {
                payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            } catch (error) {
                await this.deleteByToken.execute(refreshToken).catch(() => {});
                return res.status(401).json({ message: 'Invalid or expired refresh token' });
            }

            if (typeof payload === 'string' || typeof payload.adminId !== 'string' || !payload.jti) {
                return res.status(401).json({ error: 'Sessão inválida.' });
            }
            const adminId = payload.adminId;

            if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT access secret is not configured');
            const current = await this.searchByIdAdmin.execute(adminId);
            if (!current?.active) return res.status(401).json({ error: 'Sessão encerrada.' });
            const newAccessToken = jwt.sign({ adminId, role: current.role, amr: ['pwd'] }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });

            const newRefreshTokenId = crypto.randomUUID();
            const newRefreshToken = jwt.sign({ adminId, role: current.role, amr: ['pwd'] }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d', jwtid: newRefreshTokenId });
            const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const rotated = await this.rotateRefreshToken({ previousToken: refreshToken, previousId: payload.jti, adminId,
                id: newRefreshTokenId, token: newRefreshToken, expiresAt: newRefreshExpiresAt });
            if (!rotated) return res.status(401).json({ error: 'Sessão encerrada.' });

            res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);
            return res.status(200).json({ accessToken: newAccessToken, userId: adminId, userType: 'ADMIN', name: current.name, role: current.role });
        } catch (error: any) {
            console.error('Error during token refresh:', error);
            return res.status(500).json({ error: error.message || 'Error during token refresh' });
        }
    }

    public async logout(req: Request, res: Response): Promise<Response> {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (refreshToken) await this.deleteByToken.execute(refreshToken);

            const { maxAge, ...clearCookieOptions } = refreshCookieOptions;
            res.clearCookie('refreshToken', clearCookieOptions);
            return res.status(200).json({ message: 'Logged out successfully' });
        } catch (error: any) {
            console.error('Error during logout:', error);
            return res.status(500).json({ error: error.message || 'Error during logout' });
        }
    }

    public async update(req: AuthRequest, res: Response, teamAccess = false): Promise<Response> {
        try {
            const authenticatedAdminId = req.admin?.adminId;
            const targetAdminId = req.params.id;

            if (!authenticatedAdminId || typeof targetAdminId !== 'string') {
                return res.status(401).json({ error: 'Invalid authenticated admin' });
            }

            
            const isSelfUpdate = authenticatedAdminId === targetAdminId;
            const isSuperAdmin = req.admin?.role === AdminRole.SUPER_ADMIN;
            const adminUpdateDTO = plainToInstance(AdminUpdateDTO, req.body);
            const errors = await validate(adminUpdateDTO);
            const requestedFields = Object.keys(req.body ?? {}).filter(field => field !== 'justification');
            const justification = teamAccess || req.body?.justification !== undefined
                ? requiredText(req.body?.justification, 2000, 'justificativa') : 'Atualização do cadastro administrativo.';
            if (teamAccess && (typeof req.body.active !== 'boolean' || !Object.values(AdminRole).includes(req.body.role)
                || requestedFields.some(field => field !== 'role' && field !== 'active'))) {
                return res.status(400).json({ error: 'Selecione a função e a situação do acesso.' });
            }

            if (errors.length > 0 || requestedFields.length === 0) {
                return res.status(400).json({ error: 'Confira os dados do membro da equipe.' });
            }

            const selfAllowedFields = ['name', 'password', 'profile_picture'];
            const superAdminAllowedFields = ['name', 'email', 'role', 'active', 'profile_picture'];
            if (isSelfUpdate && isSuperAdmin) {
                superAdminAllowedFields.push('password');
            }

            const allowedFields = isSuperAdmin ? superAdminAllowedFields : selfAllowedFields;
            const unauthorizedField = requestedFields.find((field) => !allowedFields.includes(field));
            if (unauthorizedField || (!isSelfUpdate && !isSuperAdmin)) {
                return res.status(403).json({
                    error: 'You are not allowed to update the requested admin data'
                });
            }

            const targetAdmin = await this.searchByIdAdmin.execute(targetAdminId);
            if (!targetAdmin) {
                return res.status(404).json({ error: 'Admin not found' });
            }

            const updateData = Object.fromEntries(
                requestedFields.map((field) => [field, adminUpdateDTO[field as keyof AdminUpdateDTO]])
            );
            await this.updateAdmin.execute({id: targetAdminId, data: updateData, audit: {actorId: authenticatedAdminId, justification}});
            if (teamAccess) return res.sendStatus(204);

            return res.status(200).json({ message: 'Admin updated successfully' });
        } catch (error: any) {
            if (error instanceof ModerationError) return res.status(error.status).json({ error: error.message });
            if (error.code === '23505' || error.message === 'Email already registered') {
                return res.status(409).json({ error: 'Este e-mail já pertence a um membro da equipe.' });
            }
            console.error('Error updating admin:', error);
            return res.status(500).json({ error: error.message || 'Error updating admin' });
        }
    }

    public async delete(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const targetAdminId = req.params.id;
            if (typeof targetAdminId !== 'string') {
                return res.status(400).json({ error: 'Invalid admin id' });
            }
            if (!req.admin?.adminId) return res.sendStatus(401);
            const justification = req.body?.justification !== undefined ? requiredText(req.body.justification,2000,'justificativa') : 'Remoção do cadastro administrativo.';
            await this.deleteAdmin.execute({id: targetAdminId, audit: {actorId: req.admin.adminId, justification}});
            return res.status(200).json({ message: 'Admin deleted successfully' });
        } catch (error: any) {
            if (error instanceof ModerationError) return res.status(error.status).json({ error: error.message });
            console.error('Error deleting admin:', error);
            return res.status(500).json({ error: error.message || 'Error deleting admin' });
        }
    }

    public async searchByEmail(email: string) {
        const admin = await this.searchByEmailAdmin.execute(email);
        return admin;
    }

    public async searchAll(req: Request, res: Response): Promise<Response> {
        try {
            const admins = await this.searchAllAdmins.execute();
            return res.status(200).json(admins);
        } catch (error: any) {
            console.error('Error searching admin:', error);
            return res.status(500).json({ error: error.message || 'Error searching admin' });
        }
    }

    public async searchById(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const adminId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (req.admin?.role !== 'SUPER_ADMIN' && req.admin?.adminId !== adminId) return res.status(403).json({error: 'Acesso restrito à gestão.'});
            const admin = await this.searchPublicById.execute(adminId);
            if (!admin) {
                return res.status(404).json({ error: 'Admin not found' });
            }

            return res.status(200).json(admin);
        } catch (error: any) {
            console.error('Error searching admin by id:', error);
            return res.status(500).json({ error: error.message || 'Error searching admin' });
        }
    }
}

import { jsonResponse, type HttpRequest, type HttpResponse } from '../http/Http';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PasswordCrypto } from '../../service/passwordCrypto'
import jwt from 'jsonwebtoken';
import { AdminRole } from '../../domain/model/admin';

import { AdminCreateDTO } from '../../application/dto/adminDTO/AdminCreateDTO';
import { AdminLoginDTO } from '../../application/dto/adminDTO/AdminLoginDTO';
import { AdminUpdateDTO } from '../../application/dto/adminDTO/AdminUpdateDTO';

import { CreateAdmin } from '../../application/usecase/admin/CreateAdminUseCase';
import { DeleteAdmin } from '../../application/usecase/admin/DeleteAdminUseCase';
import { SearchAllAdmins } from '../../application/usecase/admin/SearchAllAdmins';
import { SearchByEmailAdmin } from '../../application/usecase/admin/SearchAdminByEmailUseCase';
import { SearchByIdAdmin } from '../../application/usecase/admin/SearchAdminByIdUseCase';
import { SearchPublicById } from '../../application/usecase/admin/PublicSearchAdminById';
import { UpdateAdmin } from '../../application/usecase/admin/UpdateAdminUseCase';

import { CreateRefreshToken } from '../../application/usecase/refresh_token/CreateRefreshTokenUseCase';
import { DeleteByToken } from '../../application/usecase/refresh_token/DeleteByTokenUseCase';
import { FindByToken } from '../../application/usecase/refresh_token/FindByTokenUseCase';

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
        private findByToken: FindByToken,
        private deleteByToken: DeleteByToken,
        private updateAdmin: UpdateAdmin,
        private deleteAdmin: DeleteAdmin,
        private searchAllAdmins: SearchAllAdmins
    ) {}

    public async register(req: HttpRequest): Promise<HttpResponse> {
        try {
            const adminCreateDTO = plainToInstance(AdminCreateDTO, req.body);
            const errors = await validate(adminCreateDTO);

            if (errors.length > 0) {
                return jsonResponse(400, {errors});
            }

            await this.createAdmin.execute(adminCreateDTO);
            return jsonResponse(201, { message: 'Admin registred succesfully' })
        } catch (error: any) {
            return jsonResponse(500, {error: error.message});
        }
    }

    public async login(req: HttpRequest): Promise<HttpResponse> {
        try{
            const adminLoginDTO = plainToInstance(AdminLoginDTO, req.body);
            const errors = await validate(adminLoginDTO);

            if (errors.length > 0) {
                return jsonResponse(400, {errors});
            }

            const admin = await this.searchByEmailAdmin.execute(adminLoginDTO.email);

            if (!admin  || !admin.password  || !(await PasswordCrypto.verifyPassword(adminLoginDTO.password, admin.password))) {
                return jsonResponse(401, {error: 'Invalid email or password'});
            }

            const accessSecret = process.env.JWT_ACCESS_SECRET;
            const refreshSecret = process.env.JWT_REFRESH_SECRET;

            if (!accessSecret || !refreshSecret) {
                return jsonResponse(500, {error: 'JWT secrets are not configured'});
            }

            
            const accessToken = jwt.sign({ adminId: admin.id, role: admin.role }, accessSecret, { expiresIn: '5m' });

            const refreshTokenId = crypto.randomUUID();
            const refreshToken = jwt.sign({ adminId: admin.id, role: admin.role }, refreshSecret, { expiresIn: '7d', jwtid: refreshTokenId });

            const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await this.createRefreshToken.execute({ id: refreshTokenId, token: refreshToken, adminId: admin.id, expiresAt: refreshExpiresAt });

            return jsonResponse(200, { accessToken, userId: admin.id }, { cookies: [{ action: 'set', name: 'refreshToken', value: refreshToken, options: refreshCookieOptions }] });
        }catch (error: any) {
            console.error('Error during login:', error);
            return jsonResponse(500, { error: error.message || 'Error during login' });
        }
    }

    public async refresh(req: HttpRequest): Promise<HttpResponse> {
        try{
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) return jsonResponse(401, { message: 'Refresh token is missing' });

            if (!process.env.JWT_REFRESH_SECRET) {
                throw new Error('JWT refresh secret is not configured');
            }

            const storedToken = await this.findByToken.execute(refreshToken);
            if (!storedToken) return jsonResponse(401, { message: 'Invalid refresh token' });

            let payload: any;
            try {
                payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            } catch (error) {
                await this.deleteByToken.execute(refreshToken).catch(() => {});
                return jsonResponse(401, { message: 'Invalid or expired refresh token' });
            }

            const adminId = payload.adminId;
            if (!payload.jti || payload.jti !== storedToken.id) {
                return jsonResponse(401, { message: 'Invalid refresh token' })
            }

            if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT access secret is not configured');
            const newAccessToken = jwt.sign({ adminId, role: payload.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });

            await this.deleteByToken.execute(refreshToken);
            const newRefreshTokenId = crypto.randomUUID();
            const newRefreshToken = jwt.sign({ adminId, role: payload.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d', jwtid: newRefreshTokenId });
            const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await this.createRefreshToken.execute({ id: newRefreshTokenId, token: newRefreshToken, adminId, expiresAt: newRefreshExpiresAt });


            return jsonResponse(200, { accessToken: newAccessToken, userId: adminId }, { cookies: [{ action: 'set', name: 'refreshToken', value: newRefreshToken, options: refreshCookieOptions }] });
        } catch (error: any) {
            console.error('Error during token refresh:', error);
            return jsonResponse(500, { error: error.message || 'Error during token refresh' });
        }
    }

    public async logout(req: HttpRequest): Promise<HttpResponse> {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) return jsonResponse(400, { message: 'refreshToken is required' });

            await this.deleteByToken.execute(refreshToken);

            const { maxAge, ...clearCookieOptions } = refreshCookieOptions;
            return jsonResponse(200, { message: 'Logged out successfully' }, { cookies: [{ action: 'clear', name: 'refreshToken', options: clearCookieOptions }] });
        } catch (error: any) {
            console.error('Error during logout:', error);
            return jsonResponse(500, { error: error.message || 'Error during logout' });
        }
    }

    public async update(req: HttpRequest): Promise<HttpResponse> {
        try {
            const authenticatedAdminId = req.admin?.adminId;
            const targetAdminId = req.params.id;

            if (!authenticatedAdminId || typeof targetAdminId !== 'string') {
                return jsonResponse(401, { error: 'Invalid authenticated admin' });
            }

            
            const isSelfUpdate = authenticatedAdminId === targetAdminId;
            const isSuperAdmin = req.admin?.role === AdminRole.SUPER_ADMIN;
            const adminUpdateDTO = plainToInstance(AdminUpdateDTO, req.body);
            const errors = await validate(adminUpdateDTO);
            const requestedFields = Object.keys(req.body);

            if (errors.length > 0 || requestedFields.length === 0) {
                return jsonResponse(400, { errors });
            }

            const selfAllowedFields = ['name', 'password', 'profile_picture'];
            const superAdminAllowedFields = ['name', 'email', 'role', 'active', 'profile_picture'];
            if (isSelfUpdate && isSuperAdmin) {
                superAdminAllowedFields.push('password');
            }

            const allowedFields = isSuperAdmin ? superAdminAllowedFields : selfAllowedFields;
            const unauthorizedField = requestedFields.find((field) => !allowedFields.includes(field));
            if (unauthorizedField || (!isSelfUpdate && !isSuperAdmin)) {
                return jsonResponse(403, {
                    error: 'You are not allowed to update the requested admin data'
                });
            }

            const targetAdmin = await this.searchByIdAdmin.execute(targetAdminId);
            if (!targetAdmin) {
                return jsonResponse(404, { error: 'Admin not found' });
            }

            const updateData = Object.fromEntries(
                requestedFields.map((field) => [field, adminUpdateDTO[field as keyof AdminUpdateDTO]])
            );
            await this.updateAdmin.execute({id: targetAdminId, data: updateData});

            return jsonResponse(200, { message: 'Admin updated successfully' });
        } catch (error: any) {
            if (error.message === 'Email already registered') {
                return jsonResponse(409, { error: error.message });
            }
            console.error('Error updating admin:', error);
            return jsonResponse(500, { error: error.message || 'Error updating admin' });
        }
    }

    public async delete(req: HttpRequest): Promise<HttpResponse> {
        try {
            const targetAdminId = req.params.id;
            if (typeof targetAdminId !== 'string') {
                return jsonResponse(400, { error: 'Invalid admin id' });
            }
            await this.deleteAdmin.execute(targetAdminId);
            return jsonResponse(200, { message: 'Admin deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting admin:', error);
            return jsonResponse(500, { error: error.message || 'Error deleting admin' });
        }
    }

    public async searchByEmail(email: string) {
        const admin = await this.searchByEmailAdmin.execute(email);
        return admin;
    }

    public async searchAll(req: HttpRequest): Promise<HttpResponse> {
        try {
            const admins = await this.searchAllAdmins.execute();
            return jsonResponse(200, admins);
        } catch (error: any) {
            console.error('Error searching admin:', error);
            return jsonResponse(500, { error: error.message || 'Error searching admin' });
        }
    }

    public async searchById(req: HttpRequest): Promise<HttpResponse> {
        try {
            const adminId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const admin = await this.searchPublicById.execute(adminId);
            if (!admin) {
                return jsonResponse(404, { error: 'Admin not found' });
            }

            return jsonResponse(200, admin);
        } catch (error: any) {
            console.error('Error searching admin by id:', error);
            return jsonResponse(500, { error: error.message || 'Error searching admin' });
        }
    }
}
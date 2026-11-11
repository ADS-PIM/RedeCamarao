import { applicationErrorResponse } from '../applicationErrorResponse';
import type { Request, Response } from 'express';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import jwt from 'jsonwebtoken';

import { randomUUID } from 'node:crypto';

import { PasswordCrypto } from '../../../../service/passwordCrypto';

import { UserCreateDTO } from '../../../../application/dto/userDTO/UserCreateDTO';
import { UserLoginDTO } from '../../../../application/dto/userDTO/UserLoginDTO';
import { UserUpdateDTO } from '../../../../application/dto/userDTO/UserUpdateDTO';

import { CreateUser } from '../../../../application/usecase/user/CreateUserCase';
import { SearchByEmailUser } from '../../../../application/usecase/user/SearchUserByEmailUseCase';
import { SearchByIdUser } from '../../../../application/usecase/user/SearchUserByIdUseCase';
import { UpdateUser } from '../../../../application/usecase/user/UpdateUserUseCase';
import { DeleteUser } from '../../../../application/usecase/user/DeleteUserUseCase';

import { CreateRefreshToken } from '../../../../application/usecase/refresh_token/CreateRefreshTokenUseCase';
import { ConsumeRefreshToken } from '../../../../application/usecase/refresh_token/ConsumeRefreshTokenUseCase';
import { DeleteByToken } from '../../../../application/usecase/refresh_token/DeleteByTokenUseCase';
import { DeleteByUserId } from '../../../../application/usecase/refresh_token/DeleteByUserIdUseCase';


import type { UserAuthRequest } from '../../../../../userAuthMiddleware';
import { UserType } from '../../../../domain/model/user';


const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

const refreshCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/users'
};



const getRefreshToken = (req: Request): string | undefined => {

    return req.cookies?.userRefreshToken;
};


export class UserController {

    constructor(
        private createUser: CreateUser,
        private searchByEmailUser: SearchByEmailUser,
        private searchByIdUser: SearchByIdUser,
        private updateUser: UpdateUser,
        private deleteUser: DeleteUser,

        private createRefreshToken: CreateRefreshToken,
        private consumeRefreshToken: ConsumeRefreshToken,
        private deleteByToken: DeleteByToken,
        private deleteByUserId: DeleteByUserId
    ) {}


    
    public async register(req: Request, res: Response): Promise<Response> {

        try {

            const userCreateDTO = plainToInstance(
                UserCreateDTO,
                req.body
            );

            const errors = await validate(userCreateDTO);

            if (errors.length > 0) {
                return res.status(400).json({
                    errors
                });
            }

            await this.createUser.execute(userCreateDTO);

            return res.status(201).json({
                message: 'User registered successfully'
            });

        } catch (error: any) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            if (
                error.message === 'Email already registered' ||
                error.code === 'ER_DUP_ENTRY'
            ) {
                return res.status(409).json({
                    error: 'Email already registered'
                });
            }

            console.error('Error registering user:', error);

            return res.status(500).json({
                error: 'Error registering user'
            });
        }
    }

    public async login(req: Request, res: Response): Promise<Response> {
        try {
            const userLoginDTO = plainToInstance(UserLoginDTO, req.body);
            const errors = await validate(userLoginDTO);

            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }

            const user = await this.searchByEmailUser.execute(userLoginDTO.email);

            if (!user || !user.password || !(await PasswordCrypto.verifyPassword(userLoginDTO.password, user.password))) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const accessSecret = process.env.JWT_ACCESS_SECRET;
            const refreshSecret = process.env.JWT_REFRESH_SECRET;

            if (!accessSecret || !refreshSecret) {
                return res.status(500).json({ error: 'JWT secrets are not configured' });
            }

            const accessToken = jwt.sign(
                { userId: user.id, userType: user.userType }, accessSecret, { expiresIn: '5m' }
            );

            const refreshTokenId = randomUUID();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const refreshToken = jwt.sign({ userId: user.id, userType: user.userType }, refreshSecret, { expiresIn: '7d', jwtid: refreshTokenId });

            await this.createRefreshToken.execute({ id: refreshTokenId, userId: user.id, token: refreshToken, expiresAt });

            res.cookie('userRefreshToken', refreshToken, refreshCookieOptions);
            return res.status(200).json({ accessToken, userId: user.id, userType: user.userType });
        } catch (error: any) {
            console.error('Error during login:', error);
            return res.status(500).json({ error: 'Error during login' });
        }
    }

    public async refresh(req: Request, res: Response): Promise<Response> {
        try {
            const refreshToken = getRefreshToken(req);
            if (!refreshToken || typeof refreshToken !== 'string') {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            const accessSecret = process.env.JWT_ACCESS_SECRET;
            const refreshSecret = process.env.JWT_REFRESH_SECRET;

            if (!accessSecret || !refreshSecret) {
                return res.status(500).json({ error: 'JWT secrets are not configured' });
            }

            let payload: jwt.JwtPayload | string;
            try {
                payload = jwt.verify(refreshToken, refreshSecret);
            } catch {
                await this.deleteByToken.execute(refreshToken).catch(() => {});
                return res.status(401).json({ error: 'Invalid or expired refresh token' });
            }

            if (typeof payload === 'string' || typeof payload.userId !== 'string' || !payload.userId || !payload.jti) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            const storedToken = await this.consumeRefreshToken.execute(refreshToken);
            if (!storedToken || storedToken.id !== payload.jti || storedToken.userId !== payload.userId) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            const user = await this.searchByIdUser.execute(payload.userId);
            if (!user) {
                return res.status(401).json({ error: 'Invalid session' });
            }

            const accessToken = jwt.sign(
                { userId: user.id, userType: user.userType }, accessSecret, { expiresIn: '5m' }
            );

            const newRefreshTokenId = randomUUID();
            const newRefreshToken = jwt.sign(
                { userId: user.id, userType: user.userType }, refreshSecret, { expiresIn: '7d', jwtid: newRefreshTokenId }
            );
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await this.createRefreshToken.execute({ id: newRefreshTokenId, userId: user.id, token: newRefreshToken, expiresAt });

            res.cookie('userRefreshToken', newRefreshToken, refreshCookieOptions);
            return res.status(200).json({ accessToken, userId: user.id, userType: user.userType });
        } catch (error: any) {
            console.error('Error refreshing token:', error);
            return res.status(500).json({ error: 'Error refreshing token' });
        }
    }


    
    public async logout(req: Request, res: Response): Promise<Response> {

        try {

            const refreshToken = getRefreshToken(req);

            if (refreshToken) {

                // Revoga o Refresh Token
                await this.deleteByToken.execute(refreshToken);
            }

            const { maxAge, ...clearCookieOptions } = refreshCookieOptions;

            
            res.clearCookie(
                'userRefreshToken',
                clearCookieOptions
            );

            return res.status(200).json({
                message: 'Logged out successfully'
            });

        } catch (error: any) {

            console.error('Error during logout:', error);

            return res.status(500).json({
                error: 'Error during logout'
            });
        }
    }



    public async searchPublicById(req: Request, res: Response): Promise<Response> {
        try {
            const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            if (!userId) {
                return res.status(404).json({
                    error: 'User not found'
                });
            }

            const user = await this.searchByIdUser.execute(userId);

            if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

            if (user.userType !== UserType.PRODUCER) {
            return res.status(404).json({
                error: 'Producer not found'
            });
        }

            return res.status(200).json({
            id: user.id,
            name: user.name,
            description: user.description,
            location: user.location,
            phone: user.phone,
            businessHours: user.businessHours,
        });
        } catch (error: any) {
            console.error('Error searching public user:', error);

            return res.status(500).json({
                error: 'Error searching user'
            });
        }
    }

    public async searchById(req: UserAuthRequest, res: Response): Promise<Response> {
        try {

            const userId = req.user?.userId


            if (!userId) {
                return res.status(401).json({
                    error: 'Unauthorized'
                });
            }

            const user = await this.searchByIdUser.execute(userId);

            if (!user) {
                return res.status(404).json({
                    error: 'User not found'
                });
            }

            return res.status(200).json(user);

        } catch (error: any) {

            console.error('Error searching user:', error);

            return res.status(500).json({
                error: 'Error searching user'
            });
        }
    }


  
    public async update(req: UserAuthRequest, res: Response): Promise<Response> {
        try {

            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({
                    error: 'Unauthorized'
                });
            }

            if (
                !req.body ||
                typeof req.body !== 'object' ||
                Array.isArray(req.body) ||
                Object.keys(req.body).length === 0
            ) {
                return res.status(400).json({
                    error: 'No data provided'
                });
            }

            const userUpdateDTO = plainToInstance(
                UserUpdateDTO,
                req.body
            );

            const errors = await validate(userUpdateDTO, {
                whitelist: true,
                forbidNonWhitelisted: true
            });

            if (errors.length > 0) {
                return res.status(400).json({
                    errors
                });
            }

            await this.updateUser.execute({
                id: userId,
                data: userUpdateDTO
            });

           
            if (userUpdateDTO.password !== undefined) {

                await this.deleteByUserId.execute(userId);

                const { maxAge, ...clearCookieOptions } = refreshCookieOptions;

                res.clearCookie(
                    'userRefreshToken',
                    clearCookieOptions
                );
            }

            return res.status(200).json({
                message: 'User updated successfully'
            });

        } catch (error: any) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

            if (error.message === 'User not found') {
                return res.status(404).json({
                    error: 'User not found'
                });
            }

            if (
                error.message === 'Email already registered' ||
                error.code === 'ER_DUP_ENTRY'
            ) {
                return res.status(409).json({
                    error: 'Email already registered'
                });
            }

            console.error('Error updating user:', error);

            return res.status(500).json({
                error: 'Error updating user'
            });
        }
    }

    public async delete(req: UserAuthRequest, res: Response): Promise<Response> {

    try {

        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthorized'
            });
        }

        await this.deleteUser.execute(userId);

        const { maxAge, ...clearCookieOptions } = refreshCookieOptions;

        res.clearCookie(
            'userRefreshToken',
            clearCookieOptions
        );

        return res.status(204).send();

    } catch (error: any) {
            const response = applicationErrorResponse(error, res);
            if (response) return response;

        if (error.message === 'User not found') {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        if (
            error.message === 'User has related records' ||
            error.code === 'ER_ROW_IS_REFERENCED_2' ||
            error.code === 'ER_ROW_IS_REFERENCED'
        ) {
            return res.status(409).json({
                error: 'User has related records and cannot be deleted'
            });
        }

        console.error('Error deleting user:', error);

        return res.status(500).json({
            error: 'Error deleting user'
        });
    }
}
}

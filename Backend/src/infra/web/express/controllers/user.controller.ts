import type { Request, Response } from 'express';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import jwt from 'jsonwebtoken';

import { randomBytes, createHash } from 'node:crypto';

import { PasswordCrypto } from '../../../../service/passwordCrypto';

import { UserCreateDTO } from '../../../../application/dto/userDTO/UserCreateDTO';
import { UserLoginDTO } from '../../../../application/dto/userDTO/UserLoginDTO';
import { UserUpdateDTO } from '../../../../application/dto/userDTO/UserUpdateDTO';

import { CreateUser } from '../../../../application/usecase/user/CreateUserCase';
import { SearchByEmailUser } from '../../../../application/usecase/user/SearchUserByEmailUseCase';
import { SearchByIdUser } from '../../../../application/usecase/user/SearchUserByIdUseCase';
import { UpdateUser } from '../../../../application/usecase/user/UpdateUserUseCase';

import { CreateUserRefreshToken } from '../../../../application/usecase/user_refresh_token/CreateUserRefreshtokenUseCase';
import { ConsumeUserRefreshToken } from '../../../../application/usecase/user_refresh_token/ConsumeUserRefreshTokenUseCase';
import { RevokeUserRefreshToken } from '../../../../application/usecase/user_refresh_token/RevokeUserRefreshTokenUseCase';
import { RevokeAllUserRefreshTokens } from '../../../../application/usecase/user_refresh_token/RevokeAllUserRefreshTokensUseCase';  

import { UserRefreshTokenDAOInterface } from '../../../../domain/interfaces/user/UserRefreshTokenDAOInterface';

import type { UserAuthRequest } from '../../../../../userAuthMiddleware';


const isProduction = process.env.NODE_ENV === 'production';

const refreshCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/users'
};



const hashToken = (token: string): string => {

    return createHash('sha256')
        .update(token)
        .digest('hex');
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

        private createUserRefreshToken: CreateUserRefreshToken,
        private consumeUserRefreshToken: ConsumeUserRefreshToken,
        private revokeUserRefreshToken: RevokeUserRefreshToken,
        private revokeAllUserRefreshTokens: RevokeAllUserRefreshTokens
    ) {}


    
    public async register(req: Request, res: Response): Promise<Response> {

        try {

            const userCreateDTO = plainToInstance(
                UserCreateDTO,
                req.body
            );

            const errors = await validate(userCreateDTO, {
                whitelist: true,
                forbidNonWhitelisted: true
            });

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

            const userLoginDTO = plainToInstance(
                UserLoginDTO,
                req.body
            );

            const errors = await validate(userLoginDTO, {
                whitelist: true,
                forbidNonWhitelisted: true
            });

            if (errors.length > 0) {
                return res.status(400).json({
                    errors
                });
            }

            const user = await this.searchByEmailUser.execute(
                userLoginDTO.email
            );

            if (
                !user ||
                !(await PasswordCrypto.verifyPassword(
                    userLoginDTO.password,
                    user.password
                ))
            ) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            const accessSecret = process.env.JWT_USER_ACCESS_SECRET;

            if (!accessSecret) {
                throw new Error('JWT user secret is not configured');
            }

            
            const accessToken = jwt.sign(
                {
                    userId: user.id,
                    userType: user.userType
                },
                accessSecret,
                {
                    expiresIn: '15m',
                    issuer: 'rede-camarao-users',
                    audience: 'rede-camarao-web'
                }
            );

            // Geração do Refresh Token
            const refreshToken = randomBytes(32).toString('hex');

            const expiresAt = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            );

            // Chama o caso de uso
            await this.createUserRefreshToken.execute({
                userId: user.id,
                tokenHash: hashToken(refreshToken),
                expiresAt
            });

           
            res.cookie(
                'userRefreshToken',
                refreshToken,
                refreshCookieOptions
            );

            return res.status(200).json({
                accessToken,
                userId: user.id,
                userType: user.userType
            });

        } catch (error: any) {

            console.error('Error during login:', error);

            return res.status(500).json({
                error: 'Error during login'
            });
        }
    }


    public async refresh(req: Request, res: Response): Promise<Response> {

        try {

            const refreshToken = getRefreshToken(req);

            if (
                !refreshToken ||
                !/^[a-f0-9]{64}$/.test(refreshToken)
            ) {
                return res.status(401).json({
                    error: 'Invalid refresh token'
                });
            }

            
            const userId = await this.consumeUserRefreshToken.execute(
                hashToken(refreshToken)
            );

            if (!userId) {
                return res.status(401).json({
                    error: 'Invalid or expired refresh token'
                });
            }

            const user = await this.searchByIdUser.execute(userId);

            if (!user) {
                return res.status(401).json({
                    error: 'Invalid session'
                });
            }

            const accessSecret = process.env.JWT_USER_ACCESS_SECRET;

            if (!accessSecret) {
                throw new Error('JWT user secret is not configured');
            }

          
            const accessToken = jwt.sign(
                {
                    userId: user.id,
                    userType: user.userType
                },
                accessSecret,
                {
                    expiresIn: '15m',
                    issuer: 'rede-camarao-users',
                    audience: 'rede-camarao-web'
                }
            );

          
            const newRefreshToken = randomBytes(32).toString('hex');

            const expiresAt = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            );

            // Armazena o novo Refresh Token
            await this.createUserRefreshToken.execute({
                userId: user.id,
                tokenHash: hashToken(newRefreshToken),
                expiresAt
            });

            res.cookie(
                'userRefreshToken',
                newRefreshToken,
                refreshCookieOptions
            );

            return res.status(200).json({
                accessToken,
                userId: user.id,
                userType: user.userType
            });

        } catch (error: any) {

            console.error('Error refreshing token:', error);

            return res.status(500).json({
                error: 'Error refreshing token'
            });
        }
    }


    
    public async logout(req: Request, res: Response): Promise<Response> {

        try {

            const refreshToken = getRefreshToken(req);

            if (refreshToken) {

                // Revoga o Refresh Token
                await this.revokeUserRefreshToken.execute(
                    hashToken(refreshToken)
                );
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



    public async searchById(
        req: UserAuthRequest,
        res: Response
    ): Promise<Response> {

        try {

            const userId = req.user?.userId;

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

            return res.status(200).json({
                id: user.id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                createdAt: user.createdAt
            });

        } catch (error: any) {

            console.error('Error searching user:', error);

            return res.status(500).json({
                error: 'Error searching user'
            });
        }
    }


  
    public async update(
        req: UserAuthRequest,
        res: Response
    ): Promise<Response> {

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

                await this.revokeAllUserRefreshTokens.execute(userId);

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
}
import { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';

export interface UserAuthRequest extends Request {
    user?: {
        userId: string;
    };
}

export const authUser = (
    req: UserAuthRequest,
    res: Response,
    next: NextFunction
): void => {

    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'Access token is required'
        });
        return;
    }

    const token = authorization.split(' ')[1];

    const secret = process.env.JWT_USER_ACCESS_SECRET;

    if (!secret) {
        res.status(500).json({
            error: 'JWT user secret is not configured'
        });
        return;
    }

    try {

        const decoded = jwt.verify(token, secret, {
            issuer: 'rede-camarao-users',
            audience: 'rede-camarao-web'
        });

        if (
            typeof decoded === 'string' ||
            typeof decoded.userId !== 'string'
        ) {
            res.status(401).json({
                error: 'Invalid access token'
            });
            return;
        }

        req.user = {
            userId: decoded.userId
        };

        next();

    } catch {

        res.status(401).json({
            error: 'Invalid or expired access token'
        });
    }
};
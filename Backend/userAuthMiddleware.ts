import { Request, Response, NextFunction } from 'express';

import { connection } from './src/util/connection';
import jwt from 'jsonwebtoken';

export interface UserAuthRequest extends Request {
    user?: {
        userId: string;
    };
}

export const accountAccess = {
    async isActive(id: string) {
        const { rows } = await connection.query("SELECT 1 FROM users WHERE id=$1 AND account_status='ACTIVE'", [id]);
        return rows.length > 0;
    }
};

export const authUser = async (
    req: UserAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {

    if (req.user) { next(); return; } // The large-body parser may already have authenticated this request.
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'Access token is required'
        });
        return;
    }

    const token = authorization.split(' ')[1];

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
        res.status(500).json({
            error: 'JWT access secret is not configured'
        });
        return;
    }

    try {

        const decoded = jwt.verify(token, secret);

        if (
            typeof decoded === 'string' ||
            typeof decoded.userId !== 'string' ||
            !decoded.userId ||
            decoded.jti !== undefined
        ) {
            res.status(401).json({
                error: 'Invalid access token'
            });
            return;
        }

        let active: boolean;
        try {
            active = await accountAccess.isActive(decoded.userId);
        } catch { res.status(503).json({ error: 'Não foi possível verificar o acesso.' }); return; }
        if (!active) { res.status(401).json({ error: 'Acesso à conta indisponível.' }); return; }
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

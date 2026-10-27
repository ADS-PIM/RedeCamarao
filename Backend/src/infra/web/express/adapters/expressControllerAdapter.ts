import type { RequestHandler } from 'express';
import type { AuthRequest } from '../../../../../authMiddleware';
import type { HttpHandler, HttpRequest } from '../../../../presentation/http/Http';

export function expressControllerAdapter(handler: HttpHandler): RequestHandler {
    return async (req, res, next): Promise<void> => {
        try {
            const admin = (req as AuthRequest).admin;
            const request: HttpRequest = {
                body: req.body,
                params: { ...req.params },
                cookies: req.cookies ? { ...req.cookies } : undefined,
                admin: admin ? { adminId: admin.adminId, role: admin.role } : undefined,
            };
            const response = await handler(request);

            for (const [name, value] of Object.entries(response.headers ?? {})) {
                res.setHeader(name, value);
            }
            for (const cookie of response.cookies ?? []) {
                if (cookie.action === 'clear') {
                    res.clearCookie(cookie.name, cookie.options);
                } else {
                    res.cookie(cookie.name, cookie.value, cookie.options ?? {});
                }
            }
            res.status(response.statusCode).json(response.body);
        } catch (error) {
            next(error);
        }
    };
}
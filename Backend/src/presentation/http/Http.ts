import type { AdminRole } from '../../domain/model/admin';

export interface HttpRequest {
    body: Record<string, unknown>;
    params: Record<string, string | string[]>;
    cookies?: Record<string, string>;
    admin?: {
        adminId?: string;
        role?: AdminRole;
    };
}

export interface HttpCookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    /** Cookie lifetime in milliseconds. */
    maxAge?: number;
    path?: string;
    domain?: string;
}

export type HttpCookie =
    | { action: 'set'; name: string; value: string; options?: HttpCookieOptions }
    | { action: 'clear'; name: string; options?: Omit<HttpCookieOptions, 'maxAge'> };

export interface HttpResponse {
    statusCode: number;
    body: unknown;
    headers?: Record<string, string>;
    cookies?: HttpCookie[];
}

export interface HttpHandler {
    (request: HttpRequest): HttpResponse | Promise<HttpResponse>;
}

export function jsonResponse(
    statusCode: number,
    body: unknown,
    options: Pick<HttpResponse, 'headers' | 'cookies'> = {},
): HttpResponse {
    return { statusCode, body, ...options };
}
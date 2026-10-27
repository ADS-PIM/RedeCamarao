import { jsonResponse, type HttpRequest, type HttpResponse } from '../http/Http';
import { isEmail } from 'class-validator';
import { PasswordResetService } from '../../service/passwordReset.service';

export const recoveryMessage = 'Se este e-mail estiver associado a uma conta ativa, você receberá um link para redefinir sua senha. Confira também a pasta de spam.';

export class PasswordResetController {
    constructor(private service: PasswordResetService) {}

    async request(req: HttpRequest): Promise<HttpResponse> {

        const email = req.body?.email;
        if (typeof email !== 'string' || email.length > 320 || !isEmail(email.trim())) {
            return recoveryResponse(400, { code: 'INVALID_EMAIL', error: 'Informe um e-mail válido.' });
        }
        try {
            await this.service.request(email);
            return recoveryResponse(202, { message: recoveryMessage });
        } catch {
            console.error('Password recovery unavailable. Check database and email configuration.');
            return recoveryResponse(503, { error: 'Não foi possível solicitar a recuperação. Tente novamente mais tarde.' });
        }
    }

    async reset(req: HttpRequest): Promise<HttpResponse> {

        const { token, password } = req.body ?? {};
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            return this.invalidLink();
        }
        // bcrypt accepts at most 72 bytes; reject truncation, including multi-byte passwords.
        if (typeof password !== 'string' || password.length < 8 || !password.trim() || Buffer.byteLength(password, 'utf8') > 72) {
            return recoveryResponse(400, { code: 'INVALID_PASSWORD', error: 'Use pelo menos 8 caracteres e no máximo 72 bytes na senha.' });
        }
        try {
            if (!await this.service.reset(token, password)) return this.invalidLink();
            const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
            const cookies: HttpResponse['cookies'] = [{ action: 'clear', name: 'refreshToken', options: { httpOnly: true, secure, sameSite: secure ? 'none' : 'lax', path: '/admin' } }];
            return recoveryResponse(200, { message: 'Senha alterada com sucesso. Entre com sua nova senha.' }, { cookies });
        } catch {
            console.error('Password reset failed. Check database availability.');
            return recoveryResponse(503, { error: 'Não foi possível alterar a senha. Tente novamente mais tarde.' });
        }
    }

    private invalidLink(): HttpResponse {
        return recoveryResponse(400, { code: 'INVALID_RESET_TOKEN', error: 'Este link é inválido ou expirou. Solicite um novo link.' });
    }
}

function recoveryResponse(
    statusCode: number,
    body: unknown,
    options: Pick<HttpResponse, 'cookies'> = {},
): HttpResponse {
    return jsonResponse(statusCode, body, {
        ...options,
        headers: { 'Cache-Control': 'no-store' },
    });
}
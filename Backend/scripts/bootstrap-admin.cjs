const { createInterface } = require('node:readline/promises');
const { Writable } = require('node:stream');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { AdminCreateDTO } = require('../src/application/dto/adminDTO/AdminCreateDTO');
const { CreateAdmin } = require('../src/application/usecase/admin/CreateAdminUseCase');
const { AdminDAOPostgres } = require('../src/infra/bd/postgres/admin.Postgres.dao');
const { connection } = require('../src/util/connection');

async function bootstrap() {
    if (!process.stdin.isTTY) throw new Error('Execute este comando em um terminal interativo.');
    const existing = await connection.query("SELECT 1 FROM administrators WHERE role='SUPER_ADMIN' LIMIT 1");
    if (existing.rowCount) throw new Error('Já existe um administrador. Use Gerenciar equipe no painel.');

    let hidden = false;
    const output = new Writable({
        write(chunk, _encoding, done) {
            if (!hidden) process.stdout.write(chunk);
            done();
        },
    });
    const prompt = createInterface({ input: process.stdin, output, terminal: true });
    try {
        const name = (await prompt.question('Nome: ')).trim();
        const email = (await prompt.question('E-mail: ')).trim();
        process.stdout.write('Senha (8 a 72 caracteres): ');
        hidden = true;
        const password = await prompt.question('');
        process.stdout.write('\nRepita a senha: ');
        const confirmation = await prompt.question('');
        process.stdout.write('\n');
        if (password !== confirmation) throw new Error('As senhas precisam coincidir.');
        const member = plainToInstance(AdminCreateDTO, { name, email, password, role: 'SUPER_ADMIN' });
        if ((await validate(member)).length) throw new Error('Confira o nome, o e-mail e o tamanho da senha.');
        await new CreateAdmin(new AdminDAOPostgres()).execute(member);
        console.log('Primeiro administrador cadastrado. Entre em /entrar?acesso=admin.');
    } finally {
        hidden = false;
        prompt.close();
    }
}

bootstrap().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
}).finally(() => connection.end());

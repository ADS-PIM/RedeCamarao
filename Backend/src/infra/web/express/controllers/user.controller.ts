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

// import { UserSessionDAOInterface } from '../../../../domain/interfaces/user/UserSessionDAOInterface';

// import type { UserAuthRequest } from '../middleware/userAuth';

export class UserController {
    constructor(){}

    public async register(req: Request, res: Response): Promise<Response> {
        const userDTO = plainToInstance(UserCreateDTO, req.body);
        const errors = await validate(userDTO);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        // Implement registration logic here
        return res.status(201).json({ message: 'User registered successfully' });
    }
}
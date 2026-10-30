import type { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import jwt from 'jsonwebtoken';
import { UserCreateDTO } from '../../../../application/dto/userDTO/UserCreateDTO';

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
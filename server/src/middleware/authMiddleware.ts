import type { Request, Response, NextFunction } from 'express';
import jwtLib from 'jsonwebtoken';

const secret_key = 'top_secret_3000_Dont_share'; 

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ message: 'Доступ заборонено. Токен відсутній.' });
    }

    try {
        const decoded = jwtLib.verify(token, secret_key);
        (req as any).user = decoded; 
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Недійсний або прострочений токен.' });
    }
};
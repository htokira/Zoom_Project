import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwtLib from 'jsonwebtoken';
import prisma from '../db.ts';

const router = Router();
const secret_key = 'top_secret_3000_Dont_share';

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!_\-?]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: 'Пароль не відповідає вимогам мінімум 8 символів, 1 велика літера, 1 цифра, 1 спецсимвол (! _ - ?)' 
            });
        }

        const userExists = await prisma.user.findFirst({
            where: { email }
        });

        if (userExists) {
            return res.status(400).json({ message: 'Користувач з таким email вже існує!' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: passwordHash
            }
        });

        const token = jwtLib.sign(
            { id: newUser.id, username: newUser.username, email: newUser.email },
            secret_key,
            { expiresIn: '24h' }
        );

        res.status(201).json({ 
            message: 'Користувача успішно створено',
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        });
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        res.status(500).json({ message: 'Внутрішня помилка сервера' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(400).json({ message: 'Невірний email або пароль!' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Невірний email або пароль!' });
        }

        const token = jwtLib.sign(
            { id: user.id, username: user.username, email: user.email },
            secret_key,
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { id: user.id, username: user.username, email: user.email } 
        });
    } catch (error) {
        console.error('Помилка логіну:', error);
        res.status(500).json({ message: 'Внутрішня помилка сервера' });
    }
});

export default router;
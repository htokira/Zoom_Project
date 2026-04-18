import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwtLib from 'jsonwebtoken';
import { getPool } from '../db.ts';

const router = Router();
const secret_key = 'top_secret_3000_Dont_share';

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const pool = getPool();

        const userExists = await pool.request()
            .input('Email', email)
            .query('SELECT Id FROM Users WHERE Email = @Email');

        if (userExists.recordset.length > 0) {
            return res.status(400).json({ message: 'Користувач з таким email вже існує!' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await pool.request()
            .input('Username', username)
            .input('Email', email)
            .input('Password', passwordHash)
            .query('INSERT INTO Users (Username, Email, Password) VALUES (@Username, @Email, @Password)');

        res.status(201).json({ message: 'Користувача успішно створено' });
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        res.status(500).json({ message: 'Внутрішня помилка сервера' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = getPool();

        const result = await pool.request()
            .input('Email', email)
            .query('SELECT * FROM Users WHERE Email = @Email');

        const user = result.recordset[0];

        if (!user) {
            return res.status(400).json({ message: 'Невірний email або пароль!' });
        }

        const validPassword = await bcrypt.compare(password, user.Password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Невірний email або пароль!' });
        }

        const token = jwtLib.sign(
            { id: user.Id, username: user.Username, email: user.Email },
            secret_key,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.Id, username: user.Username, email: user.Email } });
    } catch (error) {
        console.error('Помилка логіну:', error);
        res.status(500).json({ message: 'Внутрішня помилка сервера' });
    }
});

export default router;
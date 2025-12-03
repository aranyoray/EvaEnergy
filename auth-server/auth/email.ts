import { Router } from "express";
import { Auth } from "@auth/core";
import EmailProvider from '@auth/core/providers/email';

const router = Router();

router.use('/auth/email', async (req: Request, res: Response) =>
    Auth(req, res, {
        providers: [
            EmailProvider({
                server: process.env.EMAIL_SERVER,
                from: process.env.EMAIL_FROM,
            }),
        ],
        secret: process.env.AUTH_SECRET,
    })
);

export default router;
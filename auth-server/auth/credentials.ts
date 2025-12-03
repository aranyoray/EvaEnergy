import { Router } from "express";
import { Auth } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import bcrypt from "bcrypt";
import type { AuthConfig } from "@auth/core";

const router = Router();

// Example DB lookup — replace with real DB logic
async function findUserByEmail(email: string) {
    // Your DB logic here
    return null; // return { id, email, passwordHash }
}

// Auth.js configuration
const authConfig: AuthConfig = {
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const { email, password } = credentials as {
                    email: string;
                    password: string;
                };

                if (!email || !password) {
                    return null;
                }

                const user = await findUserByEmail(email);
                if (!user) {
                    return null;
                }

                const isValidPassword = await bcrypt.compare(
                    password,
                    user.passwordHash
                );
                if (!isValidPassword) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                };
            },
        }),
    ],
    secret: process.env.AUTH_SECRET!,
    trustHost: true,
    basePath: "/auth",
};

// Handle all /auth/* routes
router.all("/auth/*", async (req, res) => {
    try {
        // Convert Express request to Web API Request
        const protocol = req.protocol;
        const host = req.get("host");
        const url = new URL(req.originalUrl || req.url, ${protocol}://${host});

        const webRequest = new Request(url, {
            method: req.method,
            headers: new Headers(req.headers as Record<string, string>),
            body: req.method !== "GET" && req.method !== "HEAD"
                ? JSON.stringify(req.body)
                : undefined,
        });

        const response = await Auth(webRequest, authConfig);

        // Convert Web API Response to Express response
        res.status(response.status);

        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        const body = await response.text();
        res.send(body);
    } catch (error) {
        console.error("Auth error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
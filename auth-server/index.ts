// // auth-server/index.js
// import express from "express";
// import { ExpressAuth } from "@auth/express";
// import GitHub from "@auth/core/providers/github";
// import dotenv from "dotenv";
// dotenv.config();
//
// const app = express();
//
// app.use(
//     "/api/auth/*",
//     ExpressAuth({
//         providers: [
//             GitHub({
//                 clientId: process.env.GITHUB_ID,
//                 clientSecret: process.env.GITHUB_SECRET,
//             }),
//         ],
//         secret: process.env.AUTH_SECRET,
//     })
// );
//
// app.listen(3000, () => console.log("Auth server running at http://localhost:3000"));
import express from "express";
import googleAuth from "./auth/google.ts";
import emailAuth from "./auth/email.ts";
import credentialsAuth from "./auth/credentials.ts";

const app = express();

app.use(express.json());
app.use(googleAuth);
app.use(emailAuth);
app.use(credentialsAuth);

app.listen(3001, () => {
    console.log("Auth server running on :3001");
});
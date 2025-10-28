import { Router } from "express";
import { loginParticipant, registerParticipant } from "../controller/auth.js";

export const authRoutes = Router();

authRoutes.post("/",registerParticipant)
authRoutes.post("/login",loginParticipant)
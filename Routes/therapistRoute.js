import { Router } from "express";
import { createTherapist } from "../controller/auth.js";

export const therapistRoutes = Router();

therapistRoutes.post("/", createTherapist);

import express from "express";
import { createEvent, deleteEvent, getAllEvents, getEventById, updateEvent } from "../controller/event.js";

export const eventRouter  = express.Router();

eventRouter.post("/",createEvent);
eventRouter.get("/",getAllEvents);
eventRouter.get("/:id",getEventById);
eventRouter.put("/:id",updateEvent);
eventRouter.delete("/:id",deleteEvent)
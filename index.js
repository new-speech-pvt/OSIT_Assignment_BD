import "dotenv/config.js";
import express from "express";
import dbconnection from "./config/db.js";
import cors from "cors";
import ositAssignment from "./Routes/ositAssignmentRoute.js";
import { authRoutes } from "./Routes/auth.js";
import { therapistRoutes } from "./Routes/therapistRoute.js";
import { eventRouter } from "./Routes/event.js";

const app = express();
const port = 3001;

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://osit-assignment-fd.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

//Database
await dbconnection();

app.get("/", (req, res) => {
  res.send("this is my localhost");
});

app.use("/participant", authRoutes);
app.use("/osit-assignments", ositAssignment);
app.use("/therapist", therapistRoutes);

app.use("/event", eventRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

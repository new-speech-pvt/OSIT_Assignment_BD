import "dotenv/config.js";
import express from "express";
import dbconnection from "./config/db.js";
import cors from "cors";
import ositAssignment from "./Routes/ositAssignmentRoute.js";
import { authRoutes } from "./Routes/auth.js";
import { therapistRoutes } from "./Routes/therapistRoute.js";
import { eventRouter } from "./Routes/event.js";
import axios from "axios";

const app = express();
const port = 3001;

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://osit-assignment-fd.onrender.com", "https://osit.speechgears.com", "http://192.168.29.61:5173", "https://mango-forest-0bb92c400.3.azurestaticapps.net],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

//Database
await dbconnection();

const keepActive = async() =>{
  const url = "https://osit-assignment-bd.onrender.com"

  try {
    await axios.get(url);
    console.log("Status ok")
  } catch (e) {
    console.log(e.message)
  }
}

setInterval(keepActive, 180000)

app.get("/", (req, res) => {
  res.send("Working");
});

app.use("/participant", authRoutes);
app.use("/osit-assignments", ositAssignment);
app.use("/therapist", therapistRoutes);

app.use("/events", eventRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

import express from "express";
import { createOSITAssignment, deleteOSITAssignment, getAllOSITAssignments, getOSITAssignmentById, updateOSITAssignment } from "../controller/ositAssignmentsController.js";

const ositAssignment = express.Router();

ositAssignment.post("/", createOSITAssignment);
ositAssignment.get("/", getAllOSITAssignments);
ositAssignment.get("/:id", getOSITAssignmentById);
ositAssignment.put("/:id", updateOSITAssignment);
ositAssignment.delete("/:id", deleteOSITAssignment);

export default ositAssignment;

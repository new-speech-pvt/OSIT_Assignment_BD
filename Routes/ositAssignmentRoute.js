import express from "express";
import { createOrUpdateScoring, createOSITAssignment, deleteOSITAssignment, getAllAssignmentsWithScoring, getOSITAssignmentById, getParticipantAssignments, updateOSITAssignment } from "../controller/ositAssignmentsController.js";
import { requireUser } from "../middlewares/requireUser.js";
import { requireTherapist } from "../middlewares/requireTherapist.js";

const ositAssignment = express.Router();

ositAssignment.post("/",requireUser, createOSITAssignment);
ositAssignment.get("/:id", getOSITAssignmentById);
ositAssignment.put("/:id", updateOSITAssignment);
ositAssignment.delete("/:id", deleteOSITAssignment);



ositAssignment.get("/", requireTherapist, getAllAssignmentsWithScoring);
ositAssignment.get("/participant/:email", requireUser, getParticipantAssignments);
ositAssignment.post("/score", requireTherapist, createOrUpdateScoring);

export default ositAssignment;


import mongoose from "mongoose";
import AssignmentDetail from "../models/assignmentDetail.js";
import ChildProfile from "../models/childProfile.js";
import InterventionPlan from "../models/interventionPlan.js";
import OSITAssignment from "../models/OSIT_Assignment.js";
import ParticipantInfo from "../models/participantInfo.js";

// ✅ CREATE OSIT ASSIGNMENT (with transaction)
const createOSITAssignment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { participantInfo, childProfile, assignmentDetail, interventionPlan } = req.body;

    // ✅ Validate participantInfo
    const {
      fName,
      lName,
      gender,
      dob,
      phone,
      email,
      state,
      city,
      therapistType,
      enrollmentId,
    } = participantInfo || {};

    if (
      !fName ||
      !lName ||
      !gender ||
      !dob ||
      !phone ||
      !email ||
      !state ||
      !city ||
      !therapistType ||
      !enrollmentId
    ) {
      return res.status(400).json({ message: "Please fill all fields for participantInfo" });
    }

    // ✅ Validate childProfile
    const {
      name: childName,
      dob: childDob,
      gender: childGender,
      diagnosis,
      presentComplaint,
      medicalHistory,
    } = childProfile || {};

    if (!childName || !childDob || !childGender || !diagnosis || !presentComplaint || !medicalHistory) {
      return res.status(400).json({ message: "Please fill all fields for childProfile" });
    }

    // ✅ Validate assignmentDetail
    const {
      problemStatement,
      identificationAndObjectiveSetting,
      planningAndToolSection,
      toolStrategiesApproaches,
    } = assignmentDetail || {};

    if (
      !problemStatement ||
      !identificationAndObjectiveSetting ||
      !planningAndToolSection ||
      !toolStrategiesApproaches
    ) {
      return res.status(400).json({ message: "Please fill all fields for assignmentDetail" });
    }

    // ✅ Validate interventionPlan
    const { week1, week2, week3, week4, week5, mentionToolUsedForRespectiveGoal } =
      interventionPlan || {};

    if (!week1 || !week2 || !week3 || !week4 || !week5 || !mentionToolUsedForRespectiveGoal) {
      return res.status(400).json({
        message: "Please fill all fields for interventionPlan (weeks and mentionToolUsedForRespectiveGoal)",
      });
    }

    // ✅ Helper: Validate each week structure
    const validateWeek = (week) => {
      if (!week.sessions || !Array.isArray(week.sessions) || week.sessions.length === 0) return false;
      for (const session of week.sessions) {
        if (!session.sessionNo || typeof session.sessionNo !== "number") return false;
        if (!Array.isArray(session.goal) || session.goal.length === 0) return false;
        if (!Array.isArray(session.activity) || session.activity.length === 0) return false;
      }
      return true;
    };

    if (![week1, week2, week3, week4, week5].every(validateWeek)) {
      return res.status(400).json({
        message: "Invalid week structure. Check sessionNo, goal[], and activity[].",
      });
    }

    // ✅ Create sub-documents inside transaction
    const createdParticipant = await ParticipantInfo.create(
      [{ fName, lName, gender, dob, phone, email, state, city, therapistType, enrollmentId }],
      { session }
    );

    const createdChild = await ChildProfile.create(
      [{ name: childName, dob: childDob, gender: childGender, diagnosis, presentComplaint, medicalHistory }],
      { session }
    );

    const createdAssignment = await AssignmentDetail.create(
      [{ problemStatement, identificationAndObjectiveSetting, planningAndToolSection, toolStrategiesApproaches }],
      { session }
    );

    const createdIntervention = await InterventionPlan.create(
      [{ week1, week2, week3, week4, week5, mentionToolUsedForRespectiveGoal }],
      { session }
    );

    // ✅ Create main OSIT document
    const createdOSIT = await OSITAssignment.create(
      [
        {
          participantInfo: createdParticipant[0]._id,
          childProfile: createdChild[0]._id,
          assignmentDetail: createdAssignment[0]._id,
          interventionPlan: createdIntervention[0]._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "OSIT Assignment created successfully",
      ositAssignment: createdOSIT[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transaction failed:", error);
    res.status(500).json({ message: "Internal Server Error, rolled back", error: error.message });
  }
};

// ✅ GET ALL ASSIGNMENTS
const getAllOSITAssignments = async (req, res) => {
  try {
    const assignments = await OSITAssignment.find()
      .populate("participantInfo")
      .populate("childProfile")
      .populate("assignmentDetail")
      .populate("interventionPlan");

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignments", error: error.message });
  }
};

// ✅ GET SINGLE ASSIGNMENT BY ID
const getOSITAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await OSITAssignment.findById(id)
      .populate("participantInfo")
      .populate("childProfile")
      .populate("assignmentDetail")
      .populate("interventionPlan");

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    return res.status(200).json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignment", error: error.message });
  }
};

// ✅ UPDATE ASSIGNMENT
const updateOSITAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { participantInfo, childProfile, assignmentDetail, interventionPlan } = req.body;

    const ositAssignment = await OSITAssignment.findById(id);
    if (!ositAssignment) return res.status(404).json({ message: "Assignment not found" });

    // --- Update Participant Info ---
    if (participantInfo) {
      await ParticipantInfo.findByIdAndUpdate(ositAssignment.participantInfo, participantInfo, { new: true });
    }

    // --- Update Child Profile ---
    if (childProfile) {
      await ChildProfile.findByIdAndUpdate(ositAssignment.childProfile, childProfile, { new: true });
    }

    // --- Update Assignment Detail ---
    if (assignmentDetail) {
      await AssignmentDetail.findByIdAndUpdate(ositAssignment.assignmentDetail, assignmentDetail, { new: true });
    }

    // --- Update Intervention Plan ---
    if (interventionPlan) {
      const { week1, week2, week3, week4, week5, mentionToolUsedForRespectiveGoal } = interventionPlan;
      if (!week1 || !week2 || !week3 || !week4 || !week5 || !mentionToolUsedForRespectiveGoal) {
        return res.status(400).json({ message: "Please provide all weeks and mentionToolUsedForRespectiveGoal" });
      }

      await InterventionPlan.findByIdAndUpdate(ositAssignment.interventionPlan, interventionPlan, { new: true });
    }

    res.status(200).json({ message: "Assignment updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating assignment", error: error.message });
  }
};

// ✅ DELETE ASSIGNMENT
const deleteOSITAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const ositAssignment = await OSITAssignment.findById(id);
    if (!ositAssignment) return res.status(404).json({ message: "Assignment not found" });

    await ParticipantInfo.findByIdAndDelete(ositAssignment.participantInfo);
    await ChildProfile.findByIdAndDelete(ositAssignment.childProfile);
    await AssignmentDetail.findByIdAndDelete(ositAssignment.assignmentDetail);
    await InterventionPlan.findByIdAndDelete(ositAssignment.interventionPlan);

    await OSITAssignment.findByIdAndDelete(id);

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting assignment", error: error.message });
  }
};

export {
  createOSITAssignment,
  getAllOSITAssignments,
  getOSITAssignmentById,
  updateOSITAssignment,
  deleteOSITAssignment,
};

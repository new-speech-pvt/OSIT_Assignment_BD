import mongoose from "mongoose";
import AssignmentDetail from "../models/assignmentDetail.js";
import ChildProfile from "../models/childProfile.js";
import InterventionPlan from "../models/interventionPlan.js";
import OSITAssignment from "../models/OSIT_Assignment.js";
import ParticipantInfo from "../models/participantInfo.js";
import AssessmentScoring from "../models/scoring.js";
import Therapist from "../models/therapist.js";

// CREATE OSIT ASSIGNMENT (with transaction)

const createOSITAssignment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Ensure user is authenticated and req.user is available
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated.",
      });
    }

    const participantId = req.user._id;
    const {
      participantInfo,
      childProfile,
      assignmentDetail,
      interventionPlan,
    } = req.body;

    // --- Update ParticipantInfo (excluding email & password) ---
    const participantUpdate = {};
    if (participantInfo) {
      const {
        fName,
        lName,
        gender,
        dob,
        phone,
        state,
        city,
        therapistType,
        enrollmentId,
      } = participantInfo;

      if (
        !fName ||
        !lName ||
        !gender ||
        !dob ||
        !phone ||
        !state ||
        !city ||
        !therapistType ||
        !enrollmentId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All participant fields are required (fName, lName, gender, dob, phone, state, city, therapistType, enrollmentId).",
        });
      }

      Object.assign(participantUpdate, {
        fName,
        lName,
        gender,
        dob,
        phone,
        state,
        city,
        therapistType,
        enrollmentId,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "participantInfo object is required.",
      });
    }

    // Update existing participant (email & password remain unchanged)
    const updatedParticipant = await ParticipantInfo.findByIdAndUpdate(
      participantId,
      { $set: participantUpdate },
      { new: true, session, runValidators: true }
    );

    if (!updatedParticipant) {
      throw new Error("Failed to update participant information.");
    }

    // --- Validate and Create ChildProfile ---
    const {
      name: childName,
      dob: childDob,
      gender: childGender,
      diagnosis,
      presentComplaint,
      medicalHistory,
    } = childProfile || {};

    if (
      !childName ||
      !childDob ||
      !childGender ||
      !diagnosis ||
      !presentComplaint ||
      !medicalHistory
    ) {
      return res.status(400).json({
        success: false,
        message: "All childProfile fields are required.",
      });
    }

    const createdChild = await ChildProfile.create(
      [
        {
          name: childName,
          dob: childDob,
          gender: childGender,
          diagnosis,
          presentComplaint,
          medicalHistory,
        },
      ],
      { session }
    );

    // --- Validate and Create AssignmentDetail ---
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
      return res.status(400).json({
        success: false,
        message: "All assignmentDetail fields are required.",
      });
    }

    const createdAssignment = await AssignmentDetail.create(
      [
        {
          problemStatement,
          identificationAndObjectiveSetting,
          planningAndToolSection,
          toolStrategiesApproaches,
        },
      ],
      { session }
    );

    // --- Validate and Create InterventionPlan ---
    const {
      week1,
      week2,
      week3,
      week4,
      week5,
      mentionToolUsedForRespectiveGoal,
    } = interventionPlan || {};

    if (
      !week1 ||
      !week2 ||
      !week3 ||
      !week4 ||
      !week5 ||
      !mentionToolUsedForRespectiveGoal
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All 5 weeks and mentionToolUsedForRespectiveGoal are required in interventionPlan.",
      });
    }

    // Helper: Validate week structure
    const validateWeek = (week) => {
      if (
        !week.sessions ||
        !Array.isArray(week.sessions) ||
        week.sessions.length === 0
      )
        return false;
      for (const session of week.sessions) {
        if (!session.sessionNo || typeof session.sessionNo !== "number")
          return false;
        if (!Array.isArray(session.goal) || session.goal.length === 0)
          return false;
        if (!Array.isArray(session.activity) || session.activity.length === 0)
          return false;
      }
      return true;
    };

    if (![week1, week2, week3, week4, week5].every(validateWeek)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid week structure: each week must have sessions with sessionNo, goal[], and activity[].",
      });
    }

    const createdIntervention = await InterventionPlan.create(
      [
        {
          week1,
          week2,
          week3,
          week4,
          week5,
          mentionToolUsedForRespectiveGoal,
        },
      ],
      { session }
    );

    // --- Create Main OSIT Assignment ---
    const createdOSIT = await OSITAssignment.create(
      [
        {
          participantInfo: updatedParticipant._id,
          childProfile: createdChild[0]._id,
          assignmentDetail: createdAssignment[0]._id,
          interventionPlan: createdIntervention[0]._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "OSIT Assignment created successfully.",
      data: {
        ositAssignmentId: createdOSIT[0]._id,
        participantId: updatedParticipant._id,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("OSIT Assignment creation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create OSIT Assignment.",
      // eslint-disable-next-line no-undef
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};

const getAllAssignmentsWithScoring = async (req, res) => {
  try {
    const { status = "all" } = req.query;

    // Validate filter
    const validFilters = ["all", "scored", "unscored"];
    if (!validFilters.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter. Use: all, scored, or unscored.",
      });
    }

    // Build aggregation pipeline
    const pipeline = [];

    // 1. Sort by latest first
    pipeline.push({ $sort: { createdAt: -1 } });

    // 2. Lookup scoring (left join)
    pipeline.push({
      $lookup: {
        from: "assessmentscorings", // MongoDB collection name (lowercase + plural)
        localField: "_id",
        foreignField: "OSITAssignment_Id",
        as: "scoring",
      },
    });

    // 3. Unwind scoring (optional, keep assignment even if no scoring)
    pipeline.push({
      $unwind: {
        path: "$scoring",
        preserveNullAndEmptyArrays: true, // keeps assignments without scoring
      },
    });

    // 4. Filter based on status
    if (status === "scored") {
      pipeline.push({
        $match: { "scoring.OSITAssignment_Id": { $exists: true } },
      });
    } else if (status === "unscored") {
      pipeline.push({ $match: { scoring: null } });
    }
    // "all" → no filter needed

    // 5. Project final shape + compute totals
    pipeline.push({
      $project: {
        assignmentId: "$_id",
        participantInfo: 1,
        childProfile: 1,
        assignmentDetail: 1,
        interventionPlan: 1,
        createdAt: 1,
        updatedAt: 1,
        scoring: {
          $cond: {
            if: { $ifNull: ["$scoring", false] },
            then: {
              scoringId: "$scoring._id",
              therapist: "$scoring.therapist",
              criteriaList: "$scoring.criteriaList",
              totalObtained: {
                $sum: "$scoring.criteriaList.obtainedMarks",
              },
              totalPossible: {
                $sum: "$scoring.criteriaList.maxMarks",
              },
              scoredAt: "$scoring.createdAt",
            },
            else: null,
          },
        },
        hasScoring: { $ifNull: ["$scoring", false] },
      },
    });

    // 6. Populate referenced fields (after aggregation)
    const assignments = await OSITAssignment.aggregate(pipeline);

    // Populate in parallel (post-aggregation)
    const populatedAssignments = await OSITAssignment.populate(assignments, [
      {
        path: "participantInfo",
        select:
          "fName lName email _id gender phone state city therapistType enrollmentId",
      },
      { path: "childProfile", select: "name age gender" },
      { path: "assignmentDetail", select: "title description" },
      { path: "interventionPlan", select: "planName duration" },
      { path: "scoring.therapist", select: "fName lName email" },
    ]);

    // 7. Final response
    return res.status(200).json({
      success: true,
      message: "Assignments retrieved successfully.",
      data: {
        filter: status,
        total: populatedAssignments.length,
        assignments: populatedAssignments,
      },
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ✅ GET SINGLE ASSIGNMENT BY ID
const getOSITAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }
 
    const assignment = await OSITAssignment.findById(id)
      .populate("participantInfo", "fName lName email phone")
      .populate("childProfile", "name dob gender diagnosis presentComplaint medicalHistory")
      .populate("assignmentDetail", "problemStatement identificationAndObjectiveSetting planningAndToolSection toolStrategiesApproaches")
      .populate("interventionPlan", "week1 week2 week3 week4 week5 mentionToolUsedForRespectiveGoal");
 
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }
 
    const scoring = await AssessmentScoring.findOne({ OSITAssignment_Id: assignment._id })
      .populate("therapist", "fName lName email")
      .lean();
 
    let scoringData = null;
    if (scoring) {
      const totalObtained = scoring.criteriaList.reduce((sum, item) => sum + (item.obtainedMarks || 0), 0);
      const totalPossible = scoring.criteriaList.reduce((sum, item) => sum + item.maxMarks, 0);
 
      scoringData = {
        scoringId: scoring._id.toString(),
        OSITAssignment_Id: scoring.OSITAssignment_Id.toString(),
        therapist: {
          id: scoring.therapist._id.toString(),
          name: `${scoring.therapist.fName} ${scoring.therapist.lName}`,
          email: scoring.therapist.email,
        },
        criteriaList: scoring.criteriaList.map(c => ({
          criteria: c.criteria,
          maxMarks: c.maxMarks,
          obtainedMarks: c.obtainedMarks,
          remarks: c.remarks || "",
          _id: c._id.toString(),
        })),
        totalObtained,
        totalPossible,
        createdAt: scoring.createdAt,
        updatedAt: scoring.updatedAt,
      };
    }
 
    return res.status(200).json({
      success: true,
      data: {
        assignment: {
          _id: assignment._id,
          participantInfo: assignment.participantInfo,
          childProfile: assignment.childProfile,
          assignmentDetail: assignment.assignmentDetail,
          interventionPlan: assignment.interventionPlan,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        },
        scoring: scoringData,
      },
    });
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching assignment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
 
 

// ✅ UPDATE ASSIGNMENT
const updateOSITAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      participantInfo,
      childProfile,
      assignmentDetail,
      interventionPlan,
    } = req.body;

    const ositAssignment = await OSITAssignment.findById(id);
    if (!ositAssignment)
      return res.status(404).send({ message: "Assignment not found" });

    // --- Update Participant Info ---
    if (participantInfo) {
      await ParticipantInfo.findByIdAndUpdate(
        ositAssignment.participantInfo,
        participantInfo,
        { new: true }
      );
    }

    // --- Update Child Profile ---
    if (childProfile) {
      await ChildProfile.findByIdAndUpdate(
        ositAssignment.childProfile,
        childProfile,
        { new: true }
      );
    }

    // --- Update Assignment Detail ---
    if (assignmentDetail) {
      await AssignmentDetail.findByIdAndUpdate(
        ositAssignment.assignmentDetail,
        assignmentDetail,
        { new: true }
      );
    }

    // --- Update Intervention Plan ---
    if (interventionPlan) {
      const {
        week1,
        week2,
        week3,
        week4,
        week5,
        mentionToolUsedForRespectiveGoal,
      } = interventionPlan;
      if (
        !week1 ||
        !week2 ||
        !week3 ||
        !week4 ||
        !week5 ||
        !mentionToolUsedForRespectiveGoal
      ) {
        return res.status(400).json({
          message:
            "Please provide all weeks and mentionToolUsedForRespectiveGoal",
        });
      }

      await InterventionPlan.findByIdAndUpdate(
        ositAssignment.interventionPlan,
        interventionPlan,
        { new: true }
      );
    }

    res.status(200).json({ message: "Assignment updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating assignment", error: error.message });
  }
};

// ✅ DELETE ASSIGNMENT
const deleteOSITAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const ositAssignment = await OSITAssignment.findById(id);
    if (!ositAssignment)
      return res.status(404).json({ message: "Assignment not found" });

    await ParticipantInfo.findByIdAndDelete(ositAssignment.participantInfo);
    await ChildProfile.findByIdAndDelete(ositAssignment.childProfile);
    await AssignmentDetail.findByIdAndDelete(ositAssignment.assignmentDetail);
    await InterventionPlan.findByIdAndDelete(ositAssignment.interventionPlan);

    await OSITAssignment.findByIdAndDelete(id);

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting assignment", error: error.message });
  }
};

const getParticipantAssignments = async (req, res) => {
  try {
    const { email } = req.params;

    // ───── Validate input ─────
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid 'email' query parameter is required.",
      });
    }

    // ───── Find participant by email ─────
    const participant = await ParticipantInfo.findOne({ email }).lean();
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found with the provided email.",
      });
    }

    // ───── Fetch all assignments for this participant ─────
    const assignments = await OSITAssignment.find({
      participantInfo: participant._id,
    })
      .populate("childProfile", "name age") // optional: populate useful fields
      .populate("assignmentDetail", "title description")
      .populate("interventionPlan", "planName")
      .lean();

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No assignments found for this participant.",
        data: {
          participantId: participant._id,
          email: participant.email,
          assignments: [],
        },
      });
    }

    // ───── Fetch scoring for all assignment IDs in parallel ─────
    const assignmentIds = assignments.map((assign) => assign._id);

    const scorings = await AssessmentScoring.find({
      OSITAssignment_Id: { $in: assignmentIds },
    }).lean();

    // Create a map: assignmentId → scoring
    const scoringMap = {};
    scorings.forEach((score) => {
      scoringMap[score.OSITAssignment_Id.toString()] = score;
    });

    // ───── Attach scoring to each assignment (if exists) ─────
    const assignmentsWithScoring = assignments.map((assign) => {
      const assignIdStr = assign._id.toString();
      const scoring = scoringMap[assignIdStr] || null;

      return {
        assignmentId: assign._id,
        childProfile: assign.childProfile,
        assignmentDetail: assign.assignmentDetail,
        interventionPlan: assign.interventionPlan,
        scoring: scoring
          ? {
              criteriaList: scoring.criteriaList,
              totalObtained: scoring.criteriaList.reduce(
                (sum, crit) => sum + (crit.obtainedMarks || 0),
                0
              ),
              totalPossible: scoring.criteriaList.reduce(
                (sum, crit) => sum + crit.maxMarks,
                0
              ),
            }
          : null,
      };
    });

    // ───── Success response ─────
    return res.status(200).json({
      success: true,
      message: "Assignments retrieved successfully.",
      data: {
        participantId: {
          fName: participant.fName,
          lName: participant.lName,
          _id: participant._id,
          email: participant.email,
        },
        assignments: assignmentsWithScoring,
      },
    });
  } catch (error) {
    console.error("Error fetching participant assignments:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
      // eslint-disable-next-line no-undef
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const createOrUpdateScoring = async (req, res) => {
  try {
    const { OSITAssignment_Id, criteriaList } = req.body;
    const therapistId = req.user?.id; // from JWT middleware
 
    // ───── 1. Input validation ─────
    if (
      !OSITAssignment_Id ||
      !criteriaList ||
      !Array.isArray(criteriaList) ||
      criteriaList.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OSITAssignment_Id and non-empty criteriaList array are required.",
      });
    }
 
    if (!therapistId) {
      return res.status(401).json({
        success: false,
        message: "Therapist authentication required.",
      });
    }
 
    // Validate ObjectId format
    if (
      !mongoose.Types.ObjectId.isValid(OSITAssignment_Id) ||
      !mongoose.Types.ObjectId.isValid(therapistId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format.",
      });
    }
 
    // ───── 2. Validate Assignment exists ─────
    const assignment = await OSITAssignment.findById(OSITAssignment_Id).lean();
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "OSITAssignment not found.",
      });
    }
 
    // ───── 3. Validate Therapist exists ─────
    const therapist = await Therapist.findById(therapistId).lean();
    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found.",
      });
    }
 
    // ───── 4. Validate criteriaList fields ─────
    for (const item of criteriaList) {
      if (!item.criteria || typeof item.criteria !== "string") {
        return res.status(400).json({
          success: false,
          message: "Each criteria must have a valid 'criteria' string.",
        });
      }
      if (typeof item.maxMarks !== "number" || item.maxMarks <= 0) {
        return res.status(400).json({
          success: false,
          message: "'maxMarks' must be a positive number.",
        });
      }
      const obtained = item.obtainedMarks ?? 0;
      if (obtained < 0 || obtained > item.maxMarks) {
        return res.status(400).json({
          success: false,
          message: `'obtainedMarks' must be between 0 and ${item.maxMarks} for "${item.criteria}".`,
        });
      }
      item.obtainedMarks = obtained;
    }
 
    // ───── 5. Check if scoring already exists (Update) else Create ─────
    let scoring = await AssessmentScoring.findOne({ OSITAssignment_Id }).exec();
 
    if (scoring) {
      // Update existing
      scoring.criteriaList = criteriaList;
      scoring.therapist = therapistId;
      scoring.updatedAt = Date.now();
    } else {
      // Create new
      scoring = new AssessmentScoring({
        OSITAssignment_Id,
        criteriaList,
        therapist: therapistId,
      });
    }
 
    await scoring.save();
 
    // ───── 6. Compute totals for response ─────
    const totalObtained = criteriaList.reduce(
      (sum, c) => sum + (c.obtainedMarks || 0),
      0
    );
    const totalPossible = criteriaList.reduce((sum, c) => sum + c.maxMarks, 0);
 
    // ───── 7. Success Response ─────
    return res.status(scoring.isNew ? 201 : 200).json({
      success: true,
      message: scoring.isNew
        ? "Scoring created successfully."
        : "Scoring updated successfully.",
      data: {
        scoringId: scoring._id,
        OSITAssignment_Id: scoring.OSITAssignment_Id,
        therapist: {
          id: therapist._id,
          name: `${therapist.fName} ${therapist.lName}`,
          email: therapist.email,
        },
        criteriaList: scoring.criteriaList,
        totalObtained,
        totalPossible,
        createdAt: scoring.createdAt,
        updatedAt: scoring.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error in createOrUpdateScoring:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
      // eslint-disable-next-line no-undef
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
 
export {
  createOSITAssignment,
  getAllAssignmentsWithScoring,
  getOSITAssignmentById,
  updateOSITAssignment,
  deleteOSITAssignment,
  getParticipantAssignments,
  createOrUpdateScoring,
};

/* eslint-disable no-undef */
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
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated.",
      });
    }

    const participantId = req.user._id;

    const { event, childProfile, assignmentDetail, interventionPlan } =
      req.body;
    console.log("child ", event);

    const participant = await ParticipantInfo.findById(participantId).session(
      session
    );
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found.",
      });
    }

    const {
      fName,
      mName,
      lName,
      dob,
      gender,
      diagnosis,
      presentComplaint,
      medicalHistory,
    } = childProfile || {};

    if (
      !fName ||
      !mName ||
      !lName ||
      !dob ||
      !gender ||
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
          fName,
          mName,
          lName,
          dob,
          gender,
          diagnosis,
          presentComplaint,
          medicalHistory,
        },
      ],
      { session }
    );

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

    // Dynamically extract all available weeks from the plan
const weekKeys = Object.keys(interventionPlan || {});
if (weekKeys.length < 2) {
  return res.status(400).json({
    success: false,
    message: "At least 2 weeks are required in the intervention plan.",
  });
}


const validateWeek = (week) => {
  if (!week.sessions || !Array.isArray(week.sessions) || week.sessions.length === 0) {
    return false;
  }

  for (const session of week.sessions) {
    if (!session.sessionNo || typeof session.sessionNo !== "number") return false;
    if (!Array.isArray(session.goal) || session.goal.length === 0) return false;
    if (!Array.isArray(session.activity) || session.activity.length === 0) return false;
    if (!session.tool?.trim()) return false;
    if (!session.childResponse?.trim()) return false;
    if (!session.date) return false;
  }
  return true;
};

// ✅ Validate dynamically based on actual weekKeys
const invalidWeeks = weekKeys.filter((key) => !validateWeek(interventionPlan[key]));

if (invalidWeeks.length > 0) {
  return res.status(400).json({
    success: false,
    message: `Invalid data in: ${invalidWeeks.join(", ")}. Each week must have at least 1 valid session.`,
  });
}


   const dynamicWeeks = {};
weekKeys.forEach((key) => {
  dynamicWeeks[key] = interventionPlan[key];
});

const createdIntervention = await InterventionPlan.create([dynamicWeeks], { session });


    const createdOSIT = await OSITAssignment.create(
      [
        {
          event: event,
          participantInfo: participant._id,
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
        ositAssignmentId: createdOSIT._id,
        participantId: participant._id,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("OSIT Assignment creation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create OSIT Assignment.",
      error:
        process.env.NODE_ENV === "development" ? error.message : error.message,
    });
  } finally {
    session.endSession();
  }
};

const getAllAssignmentsWithScoring = async (req, res) => {
  try {
    const { status = "all" } = req.query;

    const validFilters = ["all", "scored", "unscored"];
    if (!validFilters.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter. Use: all, scored, or unscored.",
      });
    }

    const pipeline = [
      { $sort: { createdAt: -1 } },

      // 🧩 Include scoring lookup
      {
        $lookup: {
          from: "assessmentscorings",
          localField: "_id",
          foreignField: "OSITAssignment_Id",
          as: "scoring",
        },
      },
      {
        $unwind: {
          path: "$scoring",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🧩 Include event lookup
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "event",
        },
      },
      {
        $unwind: {
          path: "$event",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // 🧩 Status filtering
    if (status === "scored") {
      pipeline.push({ $match: { "scoring._id": { $exists: true } } });
    } else if (status === "unscored") {
      pipeline.push({ $match: { scoring: null } });
    }

    // 🧮 Add scoring totals
    pipeline.push({
      $addFields: {
        hasScoring: { $ifNull: ["$scoring", false] },
        totalObtained: {
          $cond: [
            { $ne: ["$scoring", null] },
            { $sum: "$scoring.criteriaList.obtainedMarks" },
            null,
          ],
        },
        totalPossible: {
          $cond: [
            { $ne: ["$scoring", null] },
            { $sum: "$scoring.criteriaList.maxMarks" },
            null,
          ],
        },
      },
    });

    // 🧾 Final projection
    pipeline.push({
      $project: {
        _id: 1,
        participantInfo: 1,
        childProfile: 1,
        assignmentDetail: 1,
        interventionPlan: 1,
        event: {
          _id: 1,
          name: 1,
          startDate: 1,
          endDate: 1,
          location: 1,
        },
        createdAt: 1,
        updatedAt: 1,
        scoring: {
          $cond: [
            "$hasScoring",
            {
              totalObtained: "$totalObtained",
              totalPossible: "$totalPossible",
            },
            null,
          ],
        },
      },
    });

    const assignments = await OSITAssignment.aggregate(pipeline);

    // 🧠 Populate participant, child, etc.
    const populatedAssignments = await OSITAssignment.populate(assignments, [
      {
        path: "participantInfo",
        select: "fName lName email phone state city therapistType enrollmentId",
      },
      { path: "childProfile", select: "name dob gender diagnosis" },
      {
        path: "assignmentDetail",
        select: "problemStatement identificationAndObjectiveSetting",
      },
      { path: "interventionPlan", select: "mentionToolUsedForRespectiveGoal" },
    ]);

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
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
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
      .populate("event")
      .populate("participantInfo", "fName lName email phone")
      .populate(
        "childProfile",
        "fName mName lName dob gender diagnosis presentComplaint medicalHistory"
      )
      .populate(
        "assignmentDetail",
        "problemStatement identificationAndObjectiveSetting planningAndToolSection toolStrategiesApproaches"
      )
      .populate(
        "interventionPlan",
        "week1 week2 week3 week4 week5 mentionToolUsedForRespectiveGoal"
      );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const scoring = await AssessmentScoring.findOne({
      OSITAssignment_Id: assignment._id,
    })
      .populate("therapist", "fName lName email")
      .lean();

    let scoringData = null;
    if (scoring) {
      const totalObtained = scoring.criteriaList.reduce(
        (sum, item) => sum + (item.obtainedMarks || 0),
        0
      );
      const totalPossible = scoring.criteriaList.reduce(
        (sum, item) => sum + item.maxMarks,
        0
      );

      scoringData = {
        scoringId: scoring._id.toString(),
        OSITAssignment_Id: scoring.OSITAssignment_Id.toString(),
        therapist: {
          id: scoring.therapist._id.toString(),
          name: `${scoring.therapist.fName} ${scoring.therapist.lName}`,
          email: scoring.therapist.email,
        },
        criteriaList: scoring.criteriaList.map((c) => ({
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
          event: assignment.event,
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
    const participant = await ParticipantInfo.findOne({ email: email }).lean();
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
      .populate("event")
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

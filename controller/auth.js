/* eslint-disable no-undef */
// controllers/authController.js (updated with JWT)

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ParticipantInfo from "../models/participantInfo.js";
import Therapist from "../models/therapist.js";

// Ensure environment variable is set
// eslint-disable-next-line no-undef
const JWT_SECRET = process.env.accessTokenKey;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET or accessTokenKey must be defined in environment variables."
  );
}

const JWT_EXPIRES_IN = "30d"; // Token valid for 7 days

const generateToken = (participantId) => {
  return jwt.sign({ _id: participantId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Registers a new participant and returns a JWT token.
 */
const registerParticipant = async (req, res) => {
  console.log("req aayi")
  const session = await mongoose.startSession();
  session.startTransaction();
 
  try {
    const {
      fName,
      lName,
      gender,
      dob,
      phone,
      email,
      password,
      state,
      city,
      therapistType,
      enrollmentId,
    } = req.body;
 
    if (!fName || !lName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "fName, lName, email, password, and phone are required.",
      });
    }
 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }
 
    if (!/^\d{10}$/.test(phone.toString())) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits.",
      });
    }
 
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters with at least one letter and one number.",
      });
    }
 
    const existingParticipant = await ParticipantInfo.findOne({
      $or: [{ email }, { phone }],
    })
      .session(session)
      .lean();
 
    if (existingParticipant) {
      const field = existingParticipant.email === email ? "Email" : "Phone";
      return res.status(409).json({
        success: false,
        message: `${field} is already registered.`,
      });
    }
 
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
 
    const newParticipant = new ParticipantInfo({
      fName: fName.trim(),
      lName: lName.trim(),
      gender: gender?.trim(),
      dob: dob ? new Date(dob) : undefined,
      phone,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      state: state?.trim(),
      city: city?.trim(),
      therapistType: therapistType?.trim(),
      enrollmentId: enrollmentId?.trim(),
    });
 
    await newParticipant.save({ session });
 
    const token = generateToken(newParticipant._id, "PARTICIPANT");
 
    await session.commitTransaction();
 
    return res.status(201).json({
      success: true,
      message: "Participant registered successfully.",
      data: {
        participantId: newParticipant._id,
        fName: newParticipant.fName,
        lName: newParticipant.lName,
        email: newParticipant.email,
        phone: newParticipant.phone,
        token,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Registration error:", error);
 
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken.`,
      });
    }
 
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during registration.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};

const createTherapist = async (req, res) => {
  try {
    const { fName, lName, phone, gender, email, password } = req.body;
    if (!fName || !lName || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (fName, lName, phone, email, password) are required.",
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }
    if (!/^\d{10}$/.test(phone.toString())) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits.",
      });
    }
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and contain at least one letter and one number.",
      });
    }
    const existingTherapist = await Therapist.findOne({
      $or: [{ email }, { phone }],
    }).lean();
    if (existingTherapist) {
      const field = existingTherapist.email === email ? "Email" : "Phone";
      return res
        .status(409)
        .json({ success: false, message: `${field} is already registered.` });
    }
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const therapist = await Therapist.create({
      fName: fName.trim(),
      lName: lName.trim(),
      phone,
      gender: gender?.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "THERAPIST",
    });
    const token = generateToken(therapist._id, "THERAPIST");
    return res.status(201).json({
      success: true,
      message: "Therapist created successfully.",
      data: {
        therapistId: therapist._id,
        fName: therapist.fName,
        lName: therapist.lName,
        email: therapist.email,
        phone: therapist.phone,
        gender: therapist.gender,
        role: therapist.role,
        token,
      },
    });
  } catch (error) {
    console.error("Error creating therapist:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } is already taken.`,
      });
    }
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const loginParticipant = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const therapist = await Therapist.findOne({ email })
      .select("+password")
      .lean();

    if (therapist) {
      const isPasswordValid = await bcrypt.compare(
        password,
        therapist.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const token = generateToken(therapist._id, "THERAPIST");

      const { password: _, ...therapistSafe } = therapist;

      return res.status(200).json({
        success: true,
        message: "Therapist login successful.",
        data: {
          userId: therapist._id,
          email: therapist.email,
          role: "THERAPIST",
          token,
          profile: therapistSafe,
        },
      });
    }

    const participant = await ParticipantInfo.findOne({ email })
      .select("+password")
      .lean();

    if (participant) {
      const isPasswordValid = await bcrypt.compare(
        password,
        participant.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const token = generateToken(participant._id, "PARTICIPANT");

      const { password: _, ...participantSafe } = participant;

      return res.status(200).json({
        success: true,
        message: "Participant login successful.",
        data: {
          userId: participant._id,
          email: participant.email,
          role: "USER",
          token,
          profile: participantSafe,
        },
      });
    }

    // ───── 3. Neither found → user does not exist ─────
    return res.status(404).json({
      success: false,
      message: "User does not exist.",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during login.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export { registerParticipant, loginParticipant, createTherapist };

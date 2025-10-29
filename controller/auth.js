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
  throw new Error("JWT_SECRET or accessTokenKey must be defined in environment variables.");
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Check for existing user
    const existingParticipant = await ParticipantInfo.findOne({ email })
      .session(session)
      .exec();

    if (existingParticipant) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new participant
    const newParticipant = new ParticipantInfo({
      email,
      password: hashedPassword,
    });

    await newParticipant.save({ session });

    // Generate JWT
    const token = generateToken(newParticipant._id);

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        participantId: newParticipant._id,
        email: newParticipant.email,
        token,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during registration.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    session.endSession();
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
      
      const isPasswordValid = await bcrypt.compare(password, therapist.password);
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
      const isPasswordValid = await bcrypt.compare(password, participant.password);
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
          role: "PARTICIPANT",
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

export default login;

export { registerParticipant, loginParticipant };
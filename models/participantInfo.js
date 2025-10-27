import mongoose from "mongoose";

const participantInfoSchema = new mongoose.Schema({
  fName: {
    type: String,
  },
  lName: {
    type: String,
  },
  gender: {
    type: String,
  },
  dob: {
    type: Date,
  },
  phone: {
    type: Number,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  therapistType: {
    type: String,
  },
  enrollmentId: {
    type: String,
  },
});

const ParticipantInfo = mongoose.model(
  "ParticipantInfo",
  participantInfoSchema
);

export default ParticipantInfo;

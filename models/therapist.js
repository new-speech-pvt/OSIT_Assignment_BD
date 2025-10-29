import mongoose from "mongoose";

const therapistSchema = mongoose.Schema({
  fName: String,
  lName: String,
  phone: { type: Number, unique: true },
  gender: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default:"THERAPIST"
  }
});

const Therapist = mongoose.model("Therapist", therapistSchema);

export default Therapist;

import mongoose, { Schema } from "mongoose";

const AssessmentScoringSchema = new Schema({
  OSITAssignment_Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OSITAssignment",
  },
  criteriaList: [
    {
      criteria: {
        type: String,
        required: true,
      },
      maxMarks: {
        type: Number,
        required: true,
      },
      obtainedMarks: {
        type: Number,
        default: 0,
      },
      remarks: {
        type: String,
      },
    },
  ],
  therapist:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Therapist",
  }
}, {timestamps:true});

const AssessmentScoring = mongoose.model('AssessmentScoring', AssessmentScoringSchema);

export default AssessmentScoring;
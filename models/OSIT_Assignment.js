import mongoose from "mongoose";

const ositAssignmentSchema = new mongoose.Schema({
    participantInfo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"ParticipantInfo"
    },
    childProfile:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"ChildProfile"
    },
    assignmentDetail:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"AssignmentDetail"
    },
    interventionPlan:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"InterventionPlan"
    }
});

const  OSITAssignment = mongoose.model("OSITAssignment", ositAssignmentSchema)

export default OSITAssignment;
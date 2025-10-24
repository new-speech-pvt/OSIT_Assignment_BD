import mongoose from "mongoose";

const assignmentDetailSchema = new mongoose.Schema({

    problemStatement:{
        type:String,
        required:true
    },
    identificationAndObjectiveSetting:{
        type:String,
        required:true
    },
    planningAndToolSection:{
        type:String,
        required:true
    },
    toolStrategiesApproaches:{
        type:String,
        required:true
    }
});

const AssignmentDetail = mongoose.model("AssignmentDetail",assignmentDetailSchema);
export default AssignmentDetail ;

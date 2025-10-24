import mongoose from "mongoose";

const participantInfoSchema =  new mongoose.Schema ({
    fName:{
      type:String,
      required:true
    },
    lName:{
     type:String,
     required:true
    },
    gender:{
        type:String,
        required:true
    },
    dob:{
        type:Date,
        required:true
    },
    phone:{
        type:Number,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    state:{
        type:String,
        required:true
    },
    city:{
      type:String,
      required:true
    },
    therapistType:{
        type:String,
        required:true
    },
    enrollmentId:{
        type:String ,
        required:true
    }
});

const ParticipantInfo = mongoose.model("ParticipantInfo",participantInfoSchema);

export default ParticipantInfo;
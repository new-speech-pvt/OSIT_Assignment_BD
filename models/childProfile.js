import mongoose from "mongoose";

const childProfileSchema = new mongoose.Schema({
 
        fname:{
            type:String,
            required:true
        },
        mname:{
            type:String,
            required:true
        },
        lname:{
            type:String,
            required:true
        },
        dob:{
            type:Date,
            required:true
        },
        gender:{
            type:String,
            required:true
        },
        diagnosis:{
            type:String,
            required:true
        },
        presentComplaint:{
        type:String,
        required:true
        },
        medicalHistory:{
            type:String,
            required:true
        }

});

const ChildProfile = mongoose.model("ChildProfile",childProfileSchema);
export default ChildProfile;

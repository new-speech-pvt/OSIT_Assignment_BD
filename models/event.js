import mongoose from "mongoose";

const eventSchema = mongoose.Schema({

    name:{
        type: String,
        required: true
    },
    startDate:{
        type: Date,
        required: true
    },
     endDate:{
        type:Date,
        required:true
     },
     submissionExpiry:{
        type:Number,
        required:true
     },
     location:{
        type:String,
        required:true
     },
},{timestamps: true});

const Events = mongoose.model("event", eventSchema);

export default Events ;
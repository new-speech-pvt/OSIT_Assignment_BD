import mongoose from "mongoose";

const interventionPlanSchema = mongoose.Schema({

    week1: {
        sessions: [{
            sessionNo: {
                type: Number,
                required: true
            },
            goal: [
                {
                    type: String,
                    required: true
                }
            ],
            activity: [{
                type: String,
                required: true

            }],
            childResponse: String,
            date: Date,
        }]
    },

    week2: {
        sessions: [{
            sessionNo: {
                type: Number,
                required: true
            },
            goal: [
                {
                    type: String,
                    required: true
                }
            ],
            activity: [{
                type: String,
                required: true

            }],
            childResponse: String,
            date: Date,
        }]
    },

    week3: {
        sessions: [{
            sessionNo: {
                type: Number,
                required: true
            },
            goal: [
                {
                    type: String,
                    required: true
                }
            ],
            activity: [{
                type: String,
                required: true

            }],
            childResponse: String,
            date: Date,
        }]

    },
    week4: {
        sessions: [{
            sessionNo: {
                type: Number,
                required: true
            },
            goal: [
                {
                    type: String,
                    required: true
                }
            ],
            activity: [{
                type: String,
                required: true

            }],
            childResponse: String,
            date: Date,
        }]

    },
    week5: {
        sessions: [{
            sessionNo: {
                type: Number,
                required: true
            },
            goal: [
                {
                    type: String,
                    required: true
                }
            ],
            activity: [{
                type: String,
                required: true

            }],
            childResponse: String,
            date: Date,
        }]

    },
    mentionToolUsedForRespectiveGoal: {
        type: String,
        required: true
    }
});

const InterventionPlan = mongoose.model("InterventionPlan", interventionPlanSchema)

export default InterventionPlan;
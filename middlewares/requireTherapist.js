/* eslint-disable no-undef */
import jwt from "jsonwebtoken";

import Therapist from "../models/therapist.js";

export const requireTherapist = async (req, res, next) => {
    if (
        !req.headers ||
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer")
    ) {
        // return res.status(401).send('Authentication header is required');
        res.status(401).json({message:"Authentication header is required"});
    }

    const accessToken = req?.headers?.authorization?.split(" ")[1];

    try {
        const decoded = jwt.verify(accessToken, process.env.accessTokenKey);
        req._id = decoded._id;
        const user = await Therapist.findById(req._id);
        if (!user) {
            return res.status(404).json({message:"User not found...",});
        }
        req.user = user;
        next();
    } catch (e) {
        // return res.status(401).send('Invalid access key');
        res.status(200).json({message:"Invalid access key"});
    }
};



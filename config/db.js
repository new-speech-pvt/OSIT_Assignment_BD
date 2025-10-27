import mongoose from "mongoose";

const dbcannection = async () => {

    const dbUrl = process.env.DB_URL;
    try {
        await mongoose.connect(dbUrl);

        console.log("database connection");

    } catch (error) {
        console.log(error);
        process.exit(1)

    }
}
export default dbcannection;
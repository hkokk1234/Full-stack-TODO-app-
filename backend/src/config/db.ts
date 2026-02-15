import mongoose from "mongoose";

const connectDb = async (mongoUri: string): Promise<void> => {
  await mongoose.connect(mongoUri);
};

export default connectDb;

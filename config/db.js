const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Mongoose 7 doesn't require useNewUrlParser and useUnifiedTopology options, but keeping it simple and robust
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

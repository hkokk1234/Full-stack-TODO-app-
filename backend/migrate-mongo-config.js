import dotenv from "dotenv";

dotenv.config();

const config = {
  mongodb: {
    url: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/todo_app",
    options: {}
  },
  migrationsDir: "database/migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".cjs",
  useFileHash: false,
  moduleSystem: "commonjs"
};

export default config;

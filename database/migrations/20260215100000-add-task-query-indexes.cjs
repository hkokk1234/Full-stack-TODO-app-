module.exports = {
  async up(db) {
    await db.collection("tasks").createIndex({ userId: 1, status: 1, dueDate: 1 }, { name: "tasks_user_status_due_idx" });
    await db.collection("tasks").createIndex({ "sharedWith.userId": 1, createdAt: -1 }, { name: "tasks_shared_user_created_idx" });
    await db.collection("notifications").createIndex(
      { userId: 1, readAt: 1, createdAt: -1 },
      { name: "notifications_user_read_created_idx" }
    );
  },

  async down(db) {
    await db.collection("tasks").dropIndex("tasks_user_status_due_idx");
    await db.collection("tasks").dropIndex("tasks_shared_user_created_idx");
    await db.collection("notifications").dropIndex("notifications_user_read_created_idx");
  }
};


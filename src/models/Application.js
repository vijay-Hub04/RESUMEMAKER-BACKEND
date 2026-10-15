const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    jobId: {
      type: String,
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    resumeId: {
      type: String,
      default: null,
    },
    matchScore: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["applied", "reviewing", "interviewing", "offered", "rejected"],
      default: "applied",
    },
    applyUrl: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a user cannot apply twice to the same job
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);

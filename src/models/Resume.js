const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    // Binary PDF/DOC/DOCX data stored directly in MongoDB for 100% free storage
    fileBuffer: {
      type: Buffer,
      required: true,
      select: false, // Exclude by default in list queries for high performance
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "analyzed", "failed"],
      default: "uploaded",
    },
    candidateInfo: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    // Optional reference to authenticated User UUID
    userId: {
      type: String,
      default: null,
      index: true,
    },
    atsScore: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
  }
);

// Virtual field for convenient download / view URL
resumeSchema.virtual("downloadUrl").get(function () {
  return `/uploadResume/${this._id}/download`;
});

resumeSchema.set("toJSON", { virtuals: true });
resumeSchema.set("toObject", { virtuals: true });

const Resume = mongoose.model("Resume", resumeSchema);

module.exports = Resume;

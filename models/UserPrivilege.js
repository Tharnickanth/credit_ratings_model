// models/UserPrivilege.js
import mongoose from 'mongoose';

const PagePrivilegeSchema = new mongoose.Schema({
  pageName: {
    type: String,
    required: true
  },
  isApproved: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const UserPrivilegeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pages: [PagePrivilegeSchema],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Create index for faster lookups
UserPrivilegeSchema.index({ userId: 1, status: 1 });

export default mongoose.models.UserPrivilege || mongoose.model('UserPrivilege', UserPrivilegeSchema);
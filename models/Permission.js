// models/Permission.js
import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['category', 'permission'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: function() {
        return this.type === 'permission';
      }
    },
    subCategory: {
      type: String
    },
    label: {
      type: String
    },
    description: {
      type: String,
      default: ''
    },
    position: {
      type: Number,
      required: true
    },
    subPosition: {
      type: Number,
      default: 0
    },
    pagename: {
      type: String
    },
    icon: {
      type: String,
      default: 'Settings'
    },
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

// Create indexes for better query performance
PermissionSchema.index({ type: 1, status: 1 });
PermissionSchema.index({ category: 1, position: 1, subPosition: 1 });

export default mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
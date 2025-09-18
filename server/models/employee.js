const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ["operator", "supervisor", "helper"], required: true },
  salary: { type: Number, default: 0 },
  contactInfo: {
    phone: String,
    address: String
  },
  assignedBay: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bay",
    default: null
  }
}, { timestamps: true });

employeeSchema.index(
  { assignedBay: 1 },
  { unique: true, partialFilterExpression: { assignedBay: { $type: "objectId" } } }
);

module.exports = mongoose.model("Employee", employeeSchema);

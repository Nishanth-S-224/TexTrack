const mongoose = require("mongoose");
const Production = require("../models/production");
const Bay = require("../models/bay");
const Employee = require("../models/employee");
const Stock = require("../models/stock");

exports.addProduction = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { bayId, loomId, employeeId, metersProduced, fabricType } = req.body;

    if (!bayId || !loomId || !employeeId || !metersProduced || !fabricType) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (metersProduced < 0) {
      return res.status(400).json({ message: "Meters produced must be positive." });
    }

    let production;

    await session.withTransaction(async () => {
      const bay = await Bay.findById(bayId).session(session);
      if (!bay) throw new Error("Bay not found.");

      const employee = await Employee.findById(employeeId).session(session);
      if (!employee) throw new Error("Employee not found.");

      production = await Production.create(
        [
          {
            bay: bayId,
            loomId,
            employee: employeeId,
            metersProduced,
            fabricType,
          },
        ],
        { session }
      );

      await Stock.findOneAndUpdate(
        { fabricType },
        { $inc: { metersInHand: metersProduced } },
        { upsert: true, new: true, session }
      );
    });

    res.status(201).json({ message: "Production added successfully.", production });
  } catch (error) {
    console.error("Error adding production:", error);
    res.status(500).json({ message: error.message || "Internal server error." });
  } finally {
    session.endSession();
  }
};

exports.updateProduction = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const { metersProduced, loomId, fabricType } = req.body;

    let production;

    await session.withTransaction(async () => {
      production = await Production.findById(id).session(session);
      if (!production) throw new Error("Production record not found.");

      let stockAdjustment = 0;

      if (metersProduced != null) {
        if (metersProduced < 0) throw new Error("Meters produced must be positive.");
        stockAdjustment = metersProduced - production.metersProduced;
        production.metersProduced = metersProduced;
      }

      if (loomId != null) production.loomId = loomId;
      if (fabricType != null) production.fabricType = fabricType;

      await production.save({ session });

      if (stockAdjustment !== 0) {
        await Stock.findOneAndUpdate(
          { fabricType: production.fabricType },
          { $inc: { metersInHand: stockAdjustment } },
          { upsert: true, new: true, session }
        );
      }
    });

    res.json({ message: "Production record updated.", production });
  } catch (error) {
    console.error("Error updating production:", error);
    res.status(500).json({ message: error.message || "Internal server error." });
  } finally {
    session.endSession();
  }
};

exports.deleteProduction = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;

    await session.withTransaction(async () => {
      const deleted = await Production.findByIdAndDelete(id).session(session);
      if (!deleted) throw new Error("Production record not found.");

      await Stock.findOneAndUpdate(
        { fabricType: deleted.fabricType },
        { $inc: { metersInHand: -deleted.metersProduced } },
        { session }
      );
    });

    res.json({ message: "Production record deleted." });
  } catch (error) {
    console.error("Error deleting production:", error);
    res.status(500).json({ message: error.message || "Internal server error." });
  } finally {
    session.endSession();
  }
};

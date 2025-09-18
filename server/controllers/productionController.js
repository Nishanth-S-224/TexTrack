const mongoose = require("mongoose");
const Production = require("../models/production");
const Bay = require("../models/bay");
const Employee = require("../models/employee");
const Stock = require("../models/stock");
const production = require("../models/production");

exports.addProduction = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    // Normalize incoming payload to support bay/bayId and employee/employeeId
    const {
      bayId: bayIdBody,
      bay,
      loomId,
      employeeId: employeeIdBody,
      employee,
      metersProduced,
      fabricType,
      date,
    } = req.body;

    const bayId = ((bayIdBody ?? bay) ?? "").toString().trim();
    const employeeId = ((employeeIdBody ?? employee) ?? "").toString().trim();

    if (!bayId || loomId == null || !employeeId || metersProduced == null || !fabricType) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(bayId)) {
      return res.status(400).json({ message: "Invalid Bay ID format." });
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID format." });
    }

    if (typeof metersProduced !== "number" || metersProduced < 0) {
      return res.status(400).json({ message: "Meters produced must be positive." });
    }

    let production;

    await session.withTransaction(async () => {
      const bayDoc = await Bay.findById(bayId).session(session);
      if (!bayDoc) throw new Error("Bay not found.");

      const employeeDoc = await Employee.findById(employeeId).session(session);
      if (!employeeDoc) throw new Error("Employee not found.");

      production = await Production.create(
        [
          {
            bay: bayId,
            loomId,
            employee: employeeId,
            metersProduced,
            fabricType,
            ...(date ? { date: new Date(date) } : {}),
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

exports.getAllProductions=async (req,res) => {
  try{
    const productions= await Production.find()
    .populate("bay")
    .populate("employee")
    .lean();

  res.json(productions);
  }
  catch(error){
    console.error("Error while fetching productions:",error);
    res.status(500).json({message:error.message||"Internal server error"});
  }
}

exports.getProductionByBay=async (req,res) => {
  try{
    const {bayId}=req.params;
    const productions=await Production.find({bay:bayId})
    .populate()
    .lean();

    if(!productions||productions.length==0){
      return res.status(404).json({message:"No productions found for this bay."});
    }
    res.json({productions});
  }
  catch(error){
    console.error("Error fetching productions by bay:",error);
    res.status(500).json({message:error.message||"Internal Server Error"});
  }
};

exports.getProductionByEmployee=async (req,res) => {
  try{
    const{employeeId}=req.params;
    const productions=await Production.find({employee:employeeId})
    .populate("bay")
    .lean();

    if(!productions||productions.length==0){
      return res.status(404).json({message:"No productions found for the employee"});
    }
    res.json(productions);
  }
  catch(error){
    console.error("Error fetching production by employee:",error);
    res.status(500).json({message:error.message||"Internal server error"});
  }
};

exports.getDailySummary=async (req,res) => {
  try{
    const startOfDay=new Date();
    startOfDay.setHours(0,0,0,0);

    const endOfDay=new Date();
    endOfDay.setHours(23,59,59,999);

    const summary=await Production.aggregate([
      {
        $match:{
          createdAt:{$gte:startOfDay,$lte:endOfDay}
        }
      },
      {
        $group:{
          _id:"$fabricType",
          totalMeters:{$sum:"$metersProduced"},
          count:{$sum:1}
        }
      }
    ]);

    res.json({date:startOfDay.toDateString(),summary});
  }
  catch(error){
    console.error("Error fetching daily summary:",error);
    res.status(500).json({message:error.message||"Internal server error"});
  }
};


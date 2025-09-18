const mongoose=require('mongoose');
const Bay=require('../models/bay');
const Employee=require('../models/employee');

class HttpError extends Error{
    constructor(status,message){
        super(message);
        this.status=status;
    }
}
exports.assignBayToEmployee=async(req,res)=>{
    const{employeeId,bayId}=req.body;

    if(!mongoose.Types.ObjectId.isValid(bayId)||!mongoose.Types.ObjectId.isValid(employeeId)){
        return res.status(400).json({message:"Invalid input format provided"});
    }
    const session=await mongoose.startSession();
    try{
        let result;

        await session.withTransaction(async () => {
            const[bay,employee]=await Promise.all([
                Bay.findById(bayId).session(session),
                Employee.findById(employeeId).session(session)
            ]);
        
        if(!bay)
            throw new HttpError(404, "Bay not found");
        if(bay.assignedEmployee)
            throw new HttpError(400, "Bay is already assigned to an employee");


        if(!employee)
            throw new HttpError(404, "Employee not found");
        if(employee.assignedBay)
            throw new HttpError(400, "Employee already has a bay assigned");
        if(employee.role!="operator")
            throw new HttpError(400, "Only operators can be assigned to the bays.This employee is a ${employee.role}.");

        employee.assignedBay=bay._id;
        bay.assignedEmployee=employee._id;

        await Promise.all([
           employee.save({session}),
           bay.save({session})
        ]);
           result={
            message:"Bay assigned to an employee",
            employee:{
                id:employee._id,
                name:employee.name,
                role:employee.role,
                assignedBay:bay.bayNumber
            },
            bay:{
                id:bay._id,
                bayNumber:bay.bayNumber,
                loomRange:bay.loomRange,
                assignedEmployee:employee.name
            }
           }; 
        });
        res.status(200).json(result);
    }
    catch(error){
        if(error instanceof HttpError){
            return res.status(error.status).json({message:error.message});
        }
        console.error("Unexpected error while assigning bay:", error);
        res.status(500).json({ message: "An unexpected error occurred." });
    }
    finally{
        session.endSession();
    }
};


exports.reassignBayToEmployee = async (req, res) => {
  try {
    let { employeeId, bayId } = req.body;

    console.log("👉 Incoming body:", req.body);

    if (!employeeId || !bayId) {
      return res.status(400).json({ message: "employeeId and bayId are required" });
    }

    // ✅ Trim IDs in case of extra spaces
    employeeId = employeeId.trim();
    bayId = bayId.trim();

    console.log("👉 Cleaned IDs:", { employeeId, bayId });

    // ✅ Validate only proper ObjectIds
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID format." });
    }
    if (!mongoose.Types.ObjectId.isValid(bayId)) {
      return res.status(400).json({ message: "Invalid Bay ID format." });
    }

    const session = await mongoose.startSession();
    let responseData;

    await session.withTransaction(async () => {
      const [employee, bay] = await Promise.all([
        Employee.findById(employeeId).session(session),
        Bay.findById(bayId).session(session),
      ]);

      console.log("👉 Found Employee:", employee);
      console.log("👉 Found Bay:", bay);

      if (!employee) throw new HttpError(404, "Employee not found");
      if (!bay) throw new HttpError(404, "Bay not found");

      if (employee.role !== "operator") {
        throw new HttpError(403, `Forbidden: ${employee.role} cannot be assigned to a bay`);
      }

      if (employee.assignedBay) {
        throw new HttpError(409, `Employee already assigned to bay ${employee.assignedBay}`);
      }

      if (bay.assignedEmployee) {
        throw new HttpError(409, `Bay already assigned to employee ${bay.assignedEmployee}`);
      }

      // ✅ Update both in one transaction
      const [updatedEmployee, updatedBay] = await Promise.all([
        Employee.findByIdAndUpdate(
          employeeId,
          { $set: { assignedBay: bay._id } },
          { new: true, session }
        ),
        Bay.findByIdAndUpdate(
          bayId,
          { $set: { assignedEmployee: employee._id } },
          { new: true, session }
        ),
      ]);

      responseData = {
        employee: {
          id: updatedEmployee._id,
          name: updatedEmployee.name,
          assignedBay: updatedEmployee.assignedBay,
        },
        bay: {
          id: updatedBay._id,
          bayNumber: updatedBay.bayNumber,
          assignedEmployee: updatedBay.assignedEmployee,
        },
      };
    });

    await session.endSession();

    return res.status(200).json({
      message: "Bay successfully re-assigned to employee",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Bay reassignment failure:", error);

    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return res.status(500).json({ message: "An internal server error has occurred." });
  }
};
exports.unassignBayFromEmployee=async(req,res)=>{
    const {employeeId}=req.body;

    if(!employeeId){
        return res.status(400).json({message:"Employee ID is required."});
    }

    if(!mongoose.Types.ObjectId.isValid(employeeId)){
        return res.status(400).json({message:"Invalid employee ID Format."});
    }
    const session=await mongoose.startSession();
    try{
        let updatedEmployee;
        let updatedBay;

        await session.withTransaction(async () => {
            const employee=await Employee.findById(employeeId).session(session);

            if(!employee)
                throw new HttpError(404, "Employee not found");
            if(!employee.assignedBay)
                throw new HttpError(400, "The employee does not have an assigned bay");
            
            const bayId=employee.assignedBay;

            [updatedEmployee,updatedBay]=await Promise.all([
                Employee.findByIdAndUpdate(
                    employeeId,
                    {$set:{assignedBay:null}},
                    {new:true,session}
                ),
                Bay.findByIdAndUpdate(
                    bayId,
                    {$set:{assignedEmployee:null}},
                    {new:true,session}
                )
            ]);
        });
        res.status(200).json({
            message:"Bay unassigned successfully",
            employee:updatedEmployee,
            bay:updatedBay
        });
    }
    catch(error){
        console.error("Failure of bay during unassignment.",error);

        if(error instanceof HttpError){
            res.status(error.status).json({message: error.message});
        }
        else{
            res.status(500).json({message:"An internal server error has occured"});
        }
    }
    finally{
        await session.endSession();
    }
}
exports.createBay=async (req,res) => {
    const{bayNumber,loomRange}=req.body;

    if(!bayNumber){
        return res.status(400).json({message:"Bay number is required"});
    }
    try{
        const existingBay= await Bay.findOne({bayNumber}); 

        if(existingBay){
            throw new HttpError(409, `Conflict: Bay with number ${bayNumber} already exists`);
        }
        const newBay=new Bay({
            bayNumber,
            loomRange
        })
        await newBay.save();
        res.status(201).json({
            message:"New Bay created successfully.",
            bay:newBay
        });
    }
    catch(error){
        if(error instanceof HttpError){
            return res.status(error.status).json(error.message);
        }
        console.error("Error while creating bays",error);
        res.status(500).json({message:"An unexpected error occured while creating a bay."})
    }
};
exports.getBayById=async (req,res) => {
    const{id}=req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({message:"Invalid Bay ID Format"});
    }
    try{
        const bay= await Bay.findById(id).populate('assignedEmployee','name role');
        if(!bay){
            throw new HttpError(404, "Bay not found");
        }
        res.status(200).json({bay});
    }
    catch(error){
        if(error instanceof HttpError){
            return res.status(error.status).json({message:error.message});
        }
        console.error(`Error while fetching bay ID ${id}`,error);
        res.status(500).json({message:"An unexpected error occured"});
    }
};
exports.getAllBays=async (req,res) => {
    try{
        const bays=await Bay.find({}).populate('assignedEmployee','name role');
        res.startSession(200).json({
            message:"Bays retreived successfully",
            count:bays.length,
            bays:bays
        });
    }
    catch(error){
        console.error("Error while fetching the bays.",error);
        res.status(500).json({message:"An unexpected error occured while fetching the bay."});
    }
};
exports.updateBay=async (req,res) => {
   
  const{id}=req.params;
  const{bayNumber,loomRange}=req.body;  

  if(!mongoose.Types.ObjectId.isValid(id)){
    return res.status(400).json({message:"Invalid bay id format."});
  }
  const updates={};
  if(bayNumber){
    updates.bayNumber=bayNumber;
  }
  if(loomRange){
    updates.loomRange=loomRange;
  }
  if(Object.keys(updates).length===0){
    return res.status(400).json({message:"No update data provided."});
  }
  try{
    if(bayNumber){
        const conflictingBay=await Bay.findOne({bayNumber:bayNumber});
        if(conflictingBay&&conflictingBay._id.toString()!==id){
            throw new HttpError(409, `Conflict:Another Bay with number ${bayNumber}already exists`);
        }
    }
    const updatedBay=await Bay.findByIdAndUpdate(id,{$set:updates},{new:true});

    if(!updatedBay){
        throw new HttpError(404, "Bay not found");
    }
    res.status(200).json({
        message:"Bay updated successfully.",
        bay:updatedBay
    });
  }
  catch(error){
    if(error instanceof HttpError){
        return res.status(error.status).json({message:error.message});
    }
    console.error(`Error while updating the bay with the ID ${id}`,error);
    res.status(500).json({message:"An unexpected error occured."})
  }
};

exports.deleteBay=async (req,res) => {
    const {id}=req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({message:"Invalid bay id format."});
    }
    const session=await Mongoose.startSession();
    try{
        await session.withTransaction(async () => {
            const bay=await Bay.findById(id).session(session);
            if(!bay){
                throw new HttpError(404, "Bay not found");
            }
            if(bay.assignedEmployee){
                throw new HttpError(409, `Conflict:Cannot delete bay.It is currently assigned to an employee.`);
            }
            await Bay.findByIdAndDelete(id,{session});
        });
        res.status(200).json({message:"Bay deleted successfully."})
    }
    catch(error){
        if(error instanceof HttpError){
            return res.status(error.status).json({message:error.message});
        }
        console.error(`Error deleting bay with ID ${id}:`,error);
        res.status(500).json({message:"An unexpected error occured"});
    }
    finally{
        await session.endSession();
    }
};
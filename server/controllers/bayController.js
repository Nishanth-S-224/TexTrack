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
            throw new HttpError(404,"Bay not found");
        if(bay.assignedEmployee)
            throw new HttpError(400,"Bay is already assigned to an employee");


        if(!employee)
            throw new HttpError(404,"Employee not found");
        if(employee.assignedBay)
            throw new HttpError(400,"Employee already has a bay assigned");
        if(employee.role!="operator")
            throw new HttpError(400,"Only operators can be assigned to the bays.This employee is a ${employee.role}.");

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


exports.reassignBayToEmployee=async (req,res) => {
    const{employeeId,bayId}=req.body;

    if(!mongoose.Types.ObjectId.isValid(employeeId)||!mongoose.Types.ObjectId.isValid(bayId))
        return res.status(400).json({message:"Invalid Employee or bay id format"});

    const session= await mongoose.startSession();
    try{
        let responseData;
        await session.withTransaction(async () => {
            const [employee,bay]=await Promise.all([
                Employee.findById(employeeId).lean().session(session),
                Bay.findById(bayId).lean().session(session)
            ]);
            if(!employee)
                throw new HttpError("Employee not found.",404);
            if(!bay)
                throw new HttpError("Bay not found",404);

            if(employee.role!="operator")
                throw new HttpError("Forbidden:Only operators can be assigned with the bays.",403);
            if(employee.assignedBay)
                throw new HttpError(`Conflict:Employee is assigned to the bay ${employee.assignedBay}.`,409);
            if(bay.assignedEmployee)
                throw new HttpError(`Conflict:Bay is assigned to the employee${bay.assignedEmployee}.`,409);

            const [updatedEmployee,updatedBay]=await Promise.all([
                Employee.findByIdAndUpdate(employeeId,{$set:{assignedBay:bayId}},{new:true,session}),
                Bay.findByIdAndUpdate(bayId,{set:{assignedEmployee:employee}},{new:true,session})
            ]);

            responseData={
                employee:{
                    _id:updatedEmployee._id,
                    name:updatedEmployee.name,
                    assignedBay:updatedEmployee.assignedBay
                },
                bay:{
                    id:updatedBay._id,
                    bayNumber:updatedBay.bayNumber,
                    assignedEmployee:updatedBay.assignedEmployee
                }
            };
        });
        res.status(200).json({
            message:"Bay successfully assigned to the employee.",
            data:responseData
        });
    }
    catch(error){
        console.error("Failure Bay during assignment:",error);

        if(error instanceof HttpError){
            res.status(error.statusCode).json({message:error.message});
        }
        else{
            res.status(500).json({message:"An internal server error has occured."});
        }
    }
    finally{
        await session.endSession();
    }
};
exports.unassignBayFromEmployee=async(req,res)=>{
    const {employeeId}=req.params;

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
                throw new HttpError("Employee not found",404);
            if(!employee.assignedBay)
                throw new HttpError("The employee does not have an assigned bay",400);
            
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
            res.status(error.statusCode).json({message:"error.message"});
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
            throw new HttpError(409,`Conflict: Bay with number ${bayNumber} already exists`);
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
    const{bayId}=req.params;
    if(!mongoose.Types.ObjectId.isValid(bayId)){
            return res.status(400).json({message:"Invalid Bay ID Format"});
    }
    try{
        const bay= await Bay.findById(bayId).populate('assignedEmployee','name role');
        if(!bay){
            throw new HttpError(404,"Bay not found");
        }
        res.status(200).json({bay});
    }
    catch(error){
        if(error instanceof HttpError){
            return res.status(error.status).json({message:error.message});
        }
        console.error(`Error while fetching bay ID ${bayId}`,error);
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
  const{bayId}=req.params;
  const{bayNumber,loomRange}=req.body;  

  if(!mongoose.Types.ObjectId.isvalid(bayId)){
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
        if(conflictBay&&conflictingBay._id.toString()!==bayId){
            throw new HttpError(409,`Conflict:Another Bay with number ${bayNumber}already exists`);
        }
    }
    const updatedBay=await Bay.findByIdAndUpdate({$set:updates},{new:true});

    if(!updatedBay){
        throw new HttpError(404,"Bay not found");
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
    console.error(`Error while updating the bay with the ID ${bayId}`,error);
    res.status(500).json({message:"An unexpected error occured."})
  }
};

exports.deleteBay=async (req,res) => {
    const {bayId}=req.params;
    if(!mongoose.Types.ObjectId.isValid(bayId)){
        return res.status(400).json({message:"Invalid bay id format."});
    }
    const session=await Mongoose.startSession();
    try{
        await session.withTransaction(async () => {
            const bay=await Bay.findById(bayId).session(session);
            if(!bay){
                throw new HttpError(404,"Bay not found");
            }
            if(bay.assignedEmployee){
                throw new HttpError(409,`Conflict:Cannot delete bay.It is currently assigned to an employee.`);
            }
            await Bay.findByIdAndDelete(bayId,{session});
        });
        res.status(200).json({message:"Bay deleted successfully."})
    }
    catch(error){
        if(error instanceof HttpError){
            return res.status(error.status).json({message:error.message});
        }
        console.error(`Error deleting bay with ID ${bayId}:`,error);
        res.status(500).json({message:"An unexpected error occured"});
    }
    finally{
        await session.endSession();
    }
};
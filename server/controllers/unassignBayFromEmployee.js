const mongoose=require('mongoose');
const Employee=require('../models/employee');
const Bay=require('../models/bay');


class HttpError extends Error{
    constructor(message,statusCode){
        super(message);
        this.statusCode=statusCode;
    }
}
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
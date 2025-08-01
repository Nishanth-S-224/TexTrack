const mongoose=require('mongoose');
const Employee=require('../models/employee');
const Bay=require('../models/bay');

class HttpError extends Error{
    constructor(message,statusCode){
        super(message);
        this.statusCode=statusCode;
    }
}

exports.reassignBayToEmployee=async (req,res) => {
    const{employeeId,bayId}=req.body;

    if(!mongoose.Types.ObjectId.isValid(employeeId)||mongoose.Types.ObjectId.isValid(bayId))
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
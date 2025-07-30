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
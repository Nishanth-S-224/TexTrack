const mongoose=require('mongoose');
const Employee=require('../models/employee');
const Bay=require('../models/bay');

class HttpError extends Error{
    constructor(message,statusCode){
        super(message);
        this.statusCode=statusCode;
    }
}

exports.getAllEmployees=async(req,res)=>{
    try{
        const employees=await Employee.find().populate('assignedBay');
        res.json(employees);
    }
    catch(err){
        res.status(500).json({message:err.message});
    }
};

exports.getEmployeeById=async(req,res)=>{
    try{
        const employee=await Employee.findById(req.params.id).populate('assignedBay');
        if(!employee){
            res.status(404).json({message:"Employee not found"});
        }
        res.json(employee);
    }
    catch(err){
        res.status(500).json({message:err.message});
    }
};

exports.createEmployee=async(req,res)=>{
    try{
    const employee=new Employee(req.body);
      await employee.save();
      res.status(201).json(employee);
    }
    catch(err){
        res.status(400).json({message:err.message});
    }
};

exports.updateEmployee=async(req,res)=>{
    try{
        const updatedEmployee= await Employee.findByIdAndUpdate(req.params.id,req.body,{new:true});
        if(!updatedEmployee){
            res.status(404).json({message:"Employee not found"});
        }
        res.json(updatedEmployee);
    }
    catch(err){
        res.status(400).json({message:err.message});
    }
};

exports.deleteEmployee=async(req,res)=>{
      try{
        const employee=await Employee.findById(req.params.id);
        if(!employee){
           res.status(400).json({message:"Employee not found"});
      }
      if(employee.assignedBay){
        await Bay.findByIdAndUpdate(employee.assignedBay,{assignedEmployee:null});
      }
      await Employee.findByIdAndDelete(id);

      res.json({message:"Employee deleted"});
      }
      catch(err){
         res.status(500).json(err.message);
      }
};

exports.assignBayToEmployee=async(req,res)=>{
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const{employeeId,bayId}=req.body;

        const[employee,bay]=await Promise.all([
            Employee.findById(employeeId).session(session),
            Bay.findById(bayId).session(session)
        ]);
        if(!employee||!bay){
            throw new Error('Employee or bay not found');
        }
        if(employee.assignedBay){
            throw new Error('Employee already has a bay assigned');
        }
        if(bay.assignedEmployee){
            throw new Error('Bay assigned to an employee');
        }
        employee.assignedBay=bay._id;
        bay.assignedEmployee=employee._id;

        await employee.save({session});
        await bay.save({session});

        await session.commitTransaction();
        res.json({message:'Bay assigned to employee successfully'});
    }
    catch(err){
        await session.abortTransaction();
        res.status(400).json({message:err.message});
    }
    finally{
        session.endSession();
    }
};

exports.reassignBayToEmployee=async(req,res)=>{
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const{employeeId,bayId}=req.body;

        const[employee,bay]=await Promise.all([
            Employee.findById(employeeId).session(session),
            Bay.findById(bayId).session(session)
        ]);

        if(!employee||!bay){
            throw new Error('Employee or bay not found');
        }
        if(bay.assignedEmployee && bay.assignedEmployee.toString()===employee._id.toString()){
            throw new Error('This bay is already assigned to this employee');
        }
        if(employee.assignedBay){
            await Bay.findByIdAndUpdate(employee.assignedBay,{assignedEmployee:null},{session});
        }
        employee.assignedBay=bay._id;
        bay.assignedEmployee=employee._id;

        await employee.save({session});
        await bay.save({session});

        await session.commitTransaction();
        res.json({message:"Bay reassigned successfully"});
    }
    catch(err){
        await session.abortTransaction();
        res.status(400).json({message:err.message});
    }
    finally{
        session.endSession();
    }
};
exports.unassignBayFromEmployee=async (req,res) => {
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const{employeeId}=req.body;

        const employee=await Employee.findById(employeeId).session(session);
        if(!employee){
            throw new Error('Employee not found');
        }

        if(employee.assignedBay){
            throw new Error('Employee does not have a bay assigned');
        }

        await Bay.findByIdAndUpdate(employee.assignedBay,{assignedEmployee:null},{session});
        employee.assignedBay=null;
        await employee.save({session});

        await session.commitTransaction();
        res.json({message:'Bay unassigned from employee successfully'})
    }
    catch(err){
        await session.abortTransaction();
        res.status(400).json({message:err.message});
    }
    finally{
        session.endSession();
    }
};



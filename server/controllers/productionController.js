const Production=require("../models/production");
const Bay=require("../models/bay");
const Employee=require("../models/employee");

exports.addProduction=async (req,res) => {
    try{
        const{bayId,loomId,employeeId,metersProduced}=req.body;

        if(!bayId||!loomId||!employeeId||!metersProduced==null){
            return res.status(400).json({message:"All fields are required."});
        }
        if(metersProduced<0){
            return res.status(400).json({message:"Meters produced must be positive."});
        }
        const bay= await Bay.findById(bayId);
        if(!bay){
            return res.status(404).json({message:"Bay not found."});}
        const employee= await Employee.findById(employeeId);
        if(!employee){
            return res.status(404).json({message:"Employee not found."});}
        
        const production= await Production.create({
            bay:bayId,
            loomId,
            emplpoyee:employeeId,
            metersProduced
        });
        res.status(201).json({message:"Production added successfully.",production});
    }
    catch(error){
        console.error("Error adding production:",error);
        res.status(500).json({message:"Internal server error."});
    }
};

exports.getAllProduction=async (req,res) => {
    try{
        const{date}=req.query;
        let filter={};
        if(date){
            const start=new Date(date);
            const end=new Date(date);
            end.setHours(23,59,59,999);
            filter.date={$gte:start,$lte:end};
        }
        const productions=await Production.find(filter)
        .populate("bay","bayNumber loomRange")
        .populate("employee","name");

        res.json(productions);
    }
    catch(error){
        console.error("Error fetching productions:",error);
        res.status(500).json({message:"Internal server error."});
    }
};

exports.getProductionByBay=async (req,res) => {
    try{
        const{bayId}=req.params;
        const productions=await Production.find({bay:bayId})
        .populate("employee","name")
        .sort({date:-1});

        res.json(productions);
    }
    catch(error){
        console.error("Error fetching bay production:",error);
        res.status(500).json({message:"Internal server error."});
    }
};

exports.getProductionByEmployee=async (req,res) => {
    try{
        const{employeeId}=req.params;
        const productions=await Production.find({employee:employeeId})
        .populate("bay","bayNumber")
        .sort({date:-1});

        res.json(productions);
    }
    catch(error){
        console.error("Error fetching employee production:",error);
        res.status(500).json({message:"Internal server error."});
    }
};

exports.getDailySummary=async (req,res) => {
    try{
        const {date}=req.query;
        if(!date)return res.status(400).json({message:"Date is required."});

        const start = new Date(date);
        const end=new Date(date);
        end.setHours(23,59,59,999);

        const summary=await Production.aggregate([
            {$match:{date:{$gte:start,$lte:end}}},
            {
                $group:{
                    _id:"$bay",
                    totalMeters:{$sum:"$meter"}
                }
            }
        ])
    }
}
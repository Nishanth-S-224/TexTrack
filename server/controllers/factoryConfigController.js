const mongoose=require('mongoose');
const factoryConfig=require('../models/factoryConfig')
const bay=require('../models/bay');
const { config } = require('dotenv');


exports.setFactoryConfig=async(req,res)=>{
    const{totalLooms,loomsPerBay}=req.body;
    if(
        typeof totalLooms!='number'||
        typeof loomsPerBay!='number'||
        totalLooms<=0||
        loomsPerBay<=0
    )
    {
        return res.status(400).json({message:"Invalid input.TotalLooms and loomsPerBay must be positive numbers."});

    }
    const session= await mongoose.startSession();
    try{
        let createdBays=[];
        
        await session.withTransaction(async()=>{
        await factoryConfig.deleteMany({},{session});
        await bay.deleteMany({},session);
        
        const [config]=await factoryConfig.create([{totalLooms,loomsPerBay}],{session});
        const totalBays=Math.ceil(totalLooms/loomsPerBay);
        const baysToCreate=[];
        for(let i=0;i<totalBays;i++){
            const from=i*loomsPerBay+1;
            const to=Math.min((i+1)*loomsPerBay,totalLooms);
            baysToCreate.push({bayNumber:i+1,loomRange:{from,to}});
        }
        if(baysToCreate.length>0){
            createdBays=await bay.insertMany(baysToCreate,{session});
        }
        res.json({
            message:"Factory Config and Bays created sucessfully.",
            config,
            bays:createdBays
        });
        });
    }
    catch(error){
     console.error("Failed to set factory config",error);
     res.status(500).json({message:"An internal server error has occured."})
    }
    finally{
        await session.endSession();
    }
};
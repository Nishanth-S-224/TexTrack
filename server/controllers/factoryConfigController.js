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
        let removedBays=[];

        await session.withTransaction(async () => {
            const existingConfig=await factoryConfig.findOne({}).session(session);

            if(existingConfig&&existingConfig.totalLooms===totalLooms&&existingConfig.loomsPerBay===loomsPerBay){
                return res.json({
                    message:"No changes detected. Factory configuration is already up to date.",
                    config:existingConfig
                });
            }
            let config;
            if(existingConfig){
                existingConfig.totalLooms=totalLooms;
                existingConfig.loomsPerBay=loomsPerBay;
                config=await existingConfig.save({session});
            }
            else{
                config=await factoryConfig.create([{totalLooms,loomsPerBay}],{session});
                config=config[0];
            }
            const totalBays=Math.ceil(totalLooms/loomsPerBay);

            const existingBays=await bay.find({}).session(session);
            for(let i=0;i<totalBays;i++){
                const from=i*loomsPerBay+1;
                const to=Math.min((i+1)*loomsPerBay,totalLooms);

                const existingBay=existingBays.find(b=>b.bayNumber===i+1);
                if(!existingBay){
                    const newBay=await bay.create([{
                        bayNumber:i+1,
                        loomRange:{from,to}
                    }],{session});
                    createdBays.push(newBay[0]);
                }
                else{
                    if(existingBay.loomRange.from !== from || existingBay.loomRange.to !== to){
                        existingBay.loomRange={from,to};
                        await existingBay.save({session});
                    }
                }
            }
            if(existingBays.length>totalBays){
                const baysToRemove=existingBays.filter(b=>b.bayNumber>totalBays);
                removedBays=baysToRemove.map(b=>b.bayNumber);

                await bay.deleteMany(
                    {bayNumber:{$in:removedBays}},
                    {session}
                );
            }
            res.json({
                message:"Factory Configuration updated successfully.",
                config,
                newBays:createdBays,
                removedBays
            });
        });
    }
    catch(error){
        console.error("Failed to set or update the factory config",error);
        res.status(500).json({message:"An internal server error has occured."});
    }
    finally{
        await session.endSession();
    }
};
exports.getFactoryConfig=async (req,res) => {
    try{
        const config = await factoryConfig.findOne();
        if(!config){
            return res.status(404).json({message:"Factory configuration not found"});
        }
        res.json(config);
    }
    catch(error){
        console.log("Failed to fetch factory config",error);
        res.status(500).json({message:"An internal server error has occured."});
    }
};


exports.updateFactoryConfig=async (req,res) => {
    const{totalLooms,loomsPerBay}=req.body;
    try{
        const updatedConfig=await factoryConfig.findOneAndUpdate(
            {},
            {totalLooms,loomsPerBay},
            {new:true}
        );
        if(!updatedConfig){
            return res.status(404).json({message:"Factory Configuration not found"});
        }
        res.json({
            message:"Factory Configuration updated successfully.",
            updatedConfig
        });
    }
    catch(error){
        console.error("Failed to fetch factory config",error);
        res.status(500).json({message:"An internal server error has occured"});
    }
};

exports.deleteFactoryConfig=async (req,res) => {
    const session = await mongoose.startSession();
    try{
        await session.withTransaction(async () => {
            await factoryConfig.deleteMany({},{session});
            await bay.deleteMany({},{session});
        });
        res.json({message:"Factory configuration and all the bays have been deleted successfully."});
    }
    catch(error){
        console.error("Failed to delete factoryConfig",error);
        res.status(500).json({message:"An internal server error has occured."});
    }
    finally{
        await session.endSession();
    }
};
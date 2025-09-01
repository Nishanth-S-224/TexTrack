const Stock=require("../models/stock");

exports.addStock=async (req,res) => {
    try{
        const{fabricType,metersInHand}=req.body;

        if(!fabricType||metersInHand==null){
            return res.status(400).json({message:"Faabric Type and meters are required."});
        }
        if(metersInHand<0){
            return res.status(400).json({message:"Meters must be non-negative."});
        }

        const stock=await Stock.create({fabricType,metersInHand})
        res.status(201).json({message:"Stock created successfully."});
    }
    catch(error){
        console.error("Error adding stock:",error);
        res.status(500).json({message:"Internal server error."});
    }
};

exports.getAllStock=async (req,res) => {
    try{
        const stock=await Stock.find();
        res.json(stock);
    }
    catch(error){
        console.error("Error while fetching stock.",error);
        res.status(500).json({message:"Internal server error."});
    }
};

exports.getStockByFabric=async (req,res) => {
    try{
        const{fabricType}=req.params;

        const stock= await Stock.findOne({ fabricType: { $regex: new RegExp(`^${fabricType}$`, "i") } });

        if(!stock){
            return res.status(404).json({message:`No stock found for this fabric:${fabricType}`});
        }
        res.json(stock);
    }
    catch(error){
        return res.status(500).json({message:"Server Error"});
    }
}
exports.updateStock=async (req,res) => {
    try{
        const{id}=req.params;
        const{metersInHand}=req.body;

        if(metersInHand==null||metersInHand<0){
            return res.status(400).json({message:"Meters must be non-negative number."});
        }
        const stock=await Stock.findByIdAndUpdate(
            id,
            {metersInHand},
            {new:true}
        );
        if(!stock){
            return res.status(404).json({message:"Stock record not found"});
        }

        res.json({message:"Stock updated successfully."});
    }
    catch(error){
        console.error("Error updating stock:",error);
        res.status(500).json({message:"Internal server error"});
    }
};

exports.deleteStock= async (req,res) => {
    try{
        const{id}=req.params;
        const deleted= await Stock.findByIdAndDelete(id);

        if(!deleted){
            return res.status(404).json({message:"Stock record not found."});
        }
        res.json({message:"Stock deleted successfully."});
    }
    catch(error){
        console.error("Error while deleting the stock:",error);
        res.status(500).json({message:"Internal server error"});
    }
};

const mongoose=require('mongoose');

const baySchema=new mongoose.Schema({
   bayNumber:Number,
   loomRange:{
    from:Number,
    to:Number
   },
   assignedEmployee:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Employee",
    unique:true,
    default:null
   }
}
,{timestamps:true,versionKey: false});

module.exports=mongoose.model("Bay",baySchema);
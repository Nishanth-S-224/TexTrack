const mongoose=require("mongoose");

const factoryConfigSchema=new mongoose.Schema({
  factoryName:{type:String,default:"MSK Tex"},
  location:{type:String,default:"Erode"},

  totalLooms:{type:Number,required:true},
  loomsPerBay:{type:Number,required:true},

  
},{timestamps:true});

module.exports=mongoose.model("FactoryConfig",factoryConfigSchema);
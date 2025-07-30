const mongoose=require('mongoose');
const factoryConfigSchema=({
  totalLooms:{type:Number,required:true},
  loomsPerBay:{type:Number,required:true}
},
{timestamps:true});
module.exports=mongoose.model("FactoryConfig",factoryConfigSchema);
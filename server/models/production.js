const mongoose=require('mongoose');

const productionSchema= new mongoose.Schema({
    bay:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Bay",
        required:true,
    },
    loomId:{
        type:Number,
        required:true,
    },
    employee:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Employee",
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
        required:true,
    },
    metersProduced:{
        type:Number,
        required:true,
        min:0,
    },
},
{timestamps:true}
);
productionSchema.index({loomId:1,date:1},{unique:true});

module.exports=mongoose.model("Production",productionSchema);
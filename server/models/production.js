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
    fabricType:{
        type:String,
        required:true,
        trim:true,
    }
},
{timestamps:true}
);

module.exports=mongoose.model("Production",productionSchema);
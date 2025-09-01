const mongoose=require("mongoose");

const stockSchema=new mongoose.schema({
    fabricType:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    totalMeters:{
        type:Number,
        required:true,
        default:0,
        min:0
    },
},
{timestamps:true}
);
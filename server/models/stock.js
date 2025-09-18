const mongoose=require("mongoose");

const stockSchema=new mongoose.Schema({
    fabricType:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    metersInHand:{
        type:Number,
        required:true,
        default:0,
        min:0
    },
},
{timestamps:true}
);

module.exports = mongoose.model("Stock", stockSchema);
const mongoose=require("mongoose");

const orderSchema= new mongoose.Schema(
    {
        customerName:{
            type:String,
            required:true,
            trim:true
        },
        fabricType:{
            type:String,
            required:true
        },
        metersOrdered:{
            type:Number,
            required:true,
            min:1
        },
        metersDispatched:{
            type:Number,
            default:0
        },
        status:{
            type:String,
            enum:["Pending","Partially Dispatched","Completed","Cancelled"],
            default:"Pending"
        },
        orderDate:{
            type:Date,
            default:Date.now
        },
        dispatchDate:{
            type:Date
        }
    },
    {timestamps:true}
);

module.exports=mongoose.model("Order",orderSchema);
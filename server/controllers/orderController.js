const mongoose=require("mongoose");
const Order=require("../models/order");
const Stock=require("../models/stock");
const order = require("../models/order");

exports.createOrder=async (req,res) => {
    const session= await mongoose.startSession();
    try{
        const{customerName,fabricType,metersOrdered}=req.body;
        if(!customerName||!fabricType||!metersOrdered){
            return res.status(400).json({message:"All fields are required."});
        }
        if(metersOrdered<=0){
            return res.status(400).json({message:"Meters must be positive"});
        }
        let order;

        await session.withTransaction(async () => {
            const stock=await Stock.findOne({fabricType}).session(session);
            if(!stock||stock.metersInHand<metersOrdered){
                throw new Error("Order cannot be placed. Insuffiencent Stock.");
            }
            order=await Order.create(
                [
                    {
                        customerName,
                        fabricType,
                        metersOrdered,
                        status:"Pending"
                    },
                ],
                {session}
            );
            stock.metersInHand-=metersOrdered;
            await stock.save({session});
        });
        res.status(201).json({message:"Order placed successfully.",order});
    }
    catch(error){
        console.error("Error while creating order.",order);
        res.status(500).json({message:err.message});
    }
    finally{
        session.endSession();
    }
};

exports.updateOrder=async (req,res) => {
    const session= await mongoose.startSession();
    try{
        const{id}=req.params;
        const{metersOrdered,status}=req.body;

        let order;
        await session.withTransaction(async () => {
            order=await Order.findById(id).session(session);
            if(!order)
                throw new Error("Order not found.");

            if(metersOrdered!=null){
                if(metersOrdered<=0){
                    throw new Error("Meters must be positive.");
                }
                const diff=metersOrdered-order.metersOrdered;

                const stock=await Stock.findOne({fabricType:order.fabricType}).session(session);
                if(!stock) throw new Error("Stock not found.");

                if(diff>0&&stock.metersInHand<diff){
                    throw new Error("Insuffiecent stock for update.")
                }
                stock.metersInHand-=diff;
                await stock.save(session);

                order.metersOrdered=metersOrdered;
            }
            if(status) order.status=status;

            await order.save(session);
        });

        res.json({message:"Order updated successfully.",order});
    }
    catch(error){
        console.error("Error while updating the order.",error);
        res.status(500).json({message:error.message});
    }
    finally{
        session.endSession();
    }
};

exports.dispatchOrder=async (req,res) => {
    const session=await mongoose.startSession();
    try{
        const{id}=req.params;
        const{metersToDispatch}=req.body;

        let order;
        await session.withTransaction(async () => {
            order=await Order.findById(id).session(session);
            if(!order)throw new Error("Order not found.");

            if(metersToDispatch<=0) throw new Error("Dispatch meters must be positive.");

            const remaining=order.metersOrdered-order.metersDispatched;
            if(metersToDispatch>remaining){
                throw new Error(`Cannot dispatch more than remaining (${remaining}m.)`);
            }

            order.metersDispatched+=metersToDispatch;

            if(order.metersDispatched===order.metersOrdered){
                order.status="Completed";
                order.dispatchDate=new Date();
            }else{
                order.status="Partially Dispatched";
            }

            await order.save({session});
        });
        res.json({message:"Order dispatched successfully.",order});
    }
    catch(error){
        console.error("Error dispatching the order.",error);
        res.status(500).json({message:error.message});
    }
    finally{
        session.endSession();
    }
};


exports.deleteOrder=async (req,res) => {
    const session=await mongoose.startSession();
    try{
        const{id}=req.params;

        await session.withTransaction(async () => {
            const session =await Order.findByIdAndDelete(id).session(session);
            if(!order)throw new Error("Order not found.");

            if(order.status==="Pending"||order.status==="Partially Dispatched"){
                const stock=await Stock.findOne({fabricType:order.fabricType}).session(session);
                if(stock){
                    stock.metersInHand+=order.metersOrdered-order.metersDispatched;
                    await stock.save({session});
                }
            }
        });
        res.json({message:"Order deleted successfully."});
    }
    catch(error){
        console.error("Error while deleting the order.",error);
        res.status(500).json({message:error.message});
    }
    finally{
        session.endSession();
    }
};


exports.getAllOrders=async (req,res) => {
    try{
        const orders=await Order.find()
        .populate("items.fabricType","fabricType currentMeters")
        .sort({orderDate:-1});

        res.json(orders);
    }
    catch(err){
        console.error("Error while fetching order:",error);
        res.status(500).json({message:"Internal server error"});
    }
}

exports.getOrderById=async (req,res) => {
    try{
        const{id}=req.params;

        const order=await Order.findById(id)
        .populate("items.fabricType","fabricType currentMeters");

        if(!order){
            return res.status(404).json({message:"Order not found"});
        }
        res.json(order);
    }
    catch(err){
        console.error("Error while fetching the order:",err);
        res.status(500).json({message:"Internal Server error"});
    }
};
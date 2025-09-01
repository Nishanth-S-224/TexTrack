const express=require('express');
const router=express.Router();
const stockController=require("../controllers/stockController");

router.post("/",stockController.addStock);

router.get("/",stockController.getAllStock);

router.get("/:fabricType",stockController.getStockByFabric);

router.put("/:id",stockController.updateStock);

router.delete("/:id",stockController.deleteStock);

module.exports=router;
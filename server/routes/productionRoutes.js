const express=require('express');
const router=express.Router();
const productionController=require("../controllers/productionController");

router.post("/",productionController.addProduction);

router.get("/",productionController.getAllProductions);

router.get("/bay/:bayId",productionController.getProductionByBay);

router.get("/employee/:employeeId",productionController.getProductionByEmployee);

router.get("/summary",productionController.getDailySummary);

router.put("/:id",productionController.updateProduction);

router.delete("/:id",productionController.deleteProduction);

module.exports=router;
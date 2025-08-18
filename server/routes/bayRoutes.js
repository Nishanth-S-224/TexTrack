const express=require("express");
const router=express.Router();
const bayController=require('../controllers/bayController');


router.post("/",bayController.createBay);
router.get("/",bayController.getAllBays);
router.get("/:id",bayController.getBayById);
router.put("/:id",bayController.updateBay);
router.delete("/:id",bayController.deleteBay);

router.post("/:bayId/assign/:employeeId",bayController.assignBayToEmployee);
router.put("/:bayId/reassign/:employeeId",bayController.reassignBayToEmployee);
router.put("/:bayId/unassign",bayController.unassignBayFromEmployee);

module.exports=router;
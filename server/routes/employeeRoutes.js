const express=require("express");
const router=express.Router();
const employeeController=require('../controllers/employeeController');

router.post("/",employeeController.createEmployee);
router.get("/",employeeController.getAllEmployees);
router.get("/:id",employeeController.getEmployeeById);
router.put("/:id",employeeController.updateEmployee);
router.delete("/:id",employeeController.deleteEmployee);

router.post("/:employeeId/assign-bay/:bayId",employeeController.assignBayToEmployee);
router.put("/:employeeId/reassign-bay/:bayId",employeeController.reassignBayToEmployee);
router.put("/:employeeId/unassign-bay",employeeController.unassignBayFromEmployee);

module.exports=router;
const express = require("express");
const router = express.Router();
const bayController = require("../controllers/bayController");

// ✅ Special routes (fixed paths first)
router.post("/assign", bayController.assignBayToEmployee);
router.put("/reassign", bayController.reassignBayToEmployee);
router.put("/unassign", bayController.unassignBayFromEmployee);

// ✅ CRUD routes (generic :id goes LAST to avoid conflicts)
router.post("/", bayController.createBay);
router.get("/", bayController.getAllBays);

// Always put :id routes AFTER specific ones
router.get("/:id", bayController.getBayById);
router.put("/:id", bayController.updateBay);
router.delete("/:id", bayController.deleteBay);

module.exports = router;

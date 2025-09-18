const express=require("express");
const router=express.Router();
const factoryConfigController=require('../controllers/factoryConfigController');

router.post('/',factoryConfigController.setFactoryConfig);
router.get('/',factoryConfigController.getFactoryConfig);
router.put('/',factoryConfigController.updateFactoryConfig);
router.delete('/',factoryConfigController.deleteFactoryConfig);

module.exports=router;
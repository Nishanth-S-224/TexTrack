const express = require("express");
const cors = require("cors");

const employeeRoutes = require("./routes/employeeRoutes");
const bayRoutes = require("./routes/bayRoutes");
const factoryConfigRoutes=require("./routes/factoryConfigRoutes");
const productionRoutes=require("./routes/productionRoutes");
const orderRoutes=require("./routes/orderRoutes");
const stockRoutes=require("./routes/stockRoutes");

const app = express();


app.use(cors());
app.use(express.json());


app.use("/api/employees", employeeRoutes);
app.use("/api/bays", bayRoutes);
app.use("/api/factory-config",factoryConfigRoutes);
app.use("/api/production",productionRoutes);
app.use("/api/order",orderRoutes);
app.use("/api/stock",stockRoutes);

module.exports = app; 
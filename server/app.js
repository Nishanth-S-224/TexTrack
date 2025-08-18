const express = require("express");
const cors = require("cors");

const employeeRoutes = require("./routes/employeeRoutes");
const bayRoutes = require("./routes/bayRoutes");
const factoryConfigRoutes=require("./routes/factoryConfigRoutes");

const app = express();


app.use(cors());
app.use(express.json());


app.use("/api/employees", employeeRoutes);
app.use("/api/bays", bayRoutes);
app.use("/api/factory-config",factoryConfigRoutes);

module.exports = app; 
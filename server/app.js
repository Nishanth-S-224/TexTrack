const express=require('express');
const cors=require('cors');
const dotenv=require("dotenv");
const connectDB=require("./db");

dotenv.config();

connectDB();

const app=express();

app.use(cors());
app.use(express.json());

app.use("/api/employees",require("./routes/employeeRoutes"));
app.use("/api/bays",require(".routes/bayRoutes"));
app.use("/api/assignment",require(".routes/assignmentRoutes"));

app.get("/",(req,res)=>{
    res.send("TexTrack backend is running");
});

module.exports=app;
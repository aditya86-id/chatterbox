import express from 'express';
import { ENV } from "./config/env.js";
const app = express()
dotenv.config();
const PORT = process.env.PORT;
app.get("/",(req,res)=>{
    res.send("Hello World")
})

console.log("MONGO_URI: ",ENV.MONGO_URI);

app.listen(ENV.PORT,()=>console.log("Server is running on port: ",process.env.PORT));
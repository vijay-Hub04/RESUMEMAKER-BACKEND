const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

async function connectionDB(){
    console.log("connection started")
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log("connected DB :",mongoose.connection.name)

        
    }catch (err){
        console.log("errormessage",err.message)

    }
}

module.exports= connectionDB

import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.on((error)=>{
        console.log("ERROR : ", error);
    })
    app.listen(process.env.PORT || 8000, ()=> {
        console.log(`server is running at port : ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
    console.log("MONGO DB CONNECTION FAILD !!", error);
    
})

//when the database is connects we have to make a promise because it is async task 
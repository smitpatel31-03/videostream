import express, { urlencoded } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    Credential: true
}))
//use method is used in middkeware and configration

app.use(express.json({limit: "16kb"}))
//we can read the data in json formate
app.use(express.urlencoded({extended : true,limit: "16kb"}))
//url encoder make space to - like "smit patel" to "smit_patel"  --- with extended we can give object inside of object
app.use(express.static("public"))
//to store files and folder in one folder
app.use(cookieParser())
//add-remove & read cookie


//routes
import userRouter from "./routes/user.routes.js"

//routes declaration
app.use("/api/v1/users", userRouter)

export { app }


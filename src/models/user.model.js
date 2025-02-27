import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username : {
            type: String,
            unique : true,
            required : true,
            lowercase : true,
            trim : true,
            index : true //if you want to enable search filde then it is better option
        },
        email : {
            type: String,
            unique : true,
            required : true,
            lowercase : true,
            trim : true
        },
        fullName : {
            type: String,
            required : true,
            trim : true,
            index: true
        },
        avatar : {
            type: String, // cloudinary url
            required : true
        },
        coverimage : {
            type: String, // cloudinary url
        },
        watchHistory : [
            {
                type : mongoose.Schema.Types.ObjectId,
                ref : "video"
            }
        ],
        password: {
            type: String,
            require: [true, "password is required"]
        },
        refreshToken :{
            type: String
        }
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next();
    
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.genrateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.genrateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRATE,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
//jwt is bearer token

export const User = mongoose.model("User",userSchema)
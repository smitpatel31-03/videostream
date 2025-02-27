import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError }  from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req, res)=>{
    
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res



    // get user details from frontend
    const {email, username, password, fullName} = req.body
    console.log("req.body :", req.body);
    
    
    
    // validation - not empty
    if(
        [email,username,password,fullName].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are compulsory or required");
    }


    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409,"username and email alrady exists")
    }


    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // console.log("req.files :", req.files);
    

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }


    //upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log("coverImage", coverImage );
    
    

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }


    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })


    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )//.select()filed is use to select filed from db


    // check for user creation
    if(!createdUser){
        throw new ApiError(500,"something went wrong while regisrting user")
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registerd successfully")
    )

} )

export {
    registerUser,
}
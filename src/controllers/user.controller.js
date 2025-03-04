import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const genrateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        
        await user.save({ validateBeforeSave: false })
        //only save the refresh token (it not validate and directly save)

        return { accessToken, refreshToken }

    } 
    catch (error) {
        throw new ApiErrorError(500, "Something Went Wrong While Genrating Refresh And Access Token");
    }
}

const registerUser = asyncHandler(async (req, res) => {

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
    const { email, username, password, fullName } = req.body
    // console.log("req.body :", req.body);



    // validation - not empty
    if (
        [email, username, password, fullName].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are compulsory or required");
    }


    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError(409, "username and email alrady exists")
    }


    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // console.log("req.files :", req.files);


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }


    //upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log("coverImage", coverImage);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
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
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while regisrting user")
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registerd successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    //get userdata
    //check username or email is given or not
    //find username or email
    //validate password
    //refreshtoken and access token
    //send cookie

    //get userdata
    const { username, email, password } = req.body
    
    //check username or email is given or not
    if (!username && !email) {
        throw new ApiError(401, "Please Enter User Details")
    }

    //find username or email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    
    if (!user) {
        throw new ApiError(404, "User Does Not Exist")
    }

    //validate password
    // console.log("user: ",user.schema.methods.isPasswordCorrect);
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials")
    }

    //refreshtoken and access token
    const { accessToken, refreshToken } = await genrateAccessAndRefreshToken(user._id)
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")//see if you ca upadte if then update it

    const options = {
        httpOnly: true,
        secured: true
    }
    
     //send cookie
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshtoken", refreshToken, options)
    .json(
        new ApiResponse(
            200,{
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    //find user
    //remove refreshtoken from user models
    //remove cookie

    //find user
    //remove refreshtoken from user models
    
    await User.findByIdAndUpdate(        
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },{
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secured: true
    }
    
    //remove cookie
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshtoken",options)
    .json(new ApiResponse(200, {}, "User Loggesout Successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) =>{
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRATE
        )
    
        const user = await User.findById(decodedToken?._id)
        
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"User's Refresh Token Is Expried Or Used")
        }
    
        const options = {
            httpOnly:true,
            secured: true
        }
    
        const {accessToken, newrefreshtoken} =  await genrateAccessAndRefreshToken(user._id)
    
        res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshtoken",newrefreshtoken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken,newrefreshtoken},
                "User's Access Token Refreshed Successflly"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Users's Refresh Token");
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}
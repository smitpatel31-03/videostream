import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Subscription } from "../models/subscription.model.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

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
        throw new ApiError(500, "Something Went Wrong While Genrating Refresh And Access Token");
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

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }


    //upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

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
                200, {
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
            $set: {
                refreshToken: undefined
            }
        }, {
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
        .clearCookie("accessToken", options)
        .clearCookie("refreshtoken", options)
        .json(new ApiResponse(200, {}, "User Loggesout Successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRATE
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "User's Refresh Token Is Expried Or Used")
        }

        const options = {
            httpOnly: true,
            secured: true
        }

        const { accessToken, newrefreshtoken } = await genrateAccessAndRefreshToken(user._id)

        res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshtoken", newrefreshtoken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, newrefreshtoken },
                    "User's Access Token Refreshed Successflly"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Users's Refresh Token");
    }
})

const changeCurruntUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confPassword } = req.body

    if (newPassword !== confPassword) {
        throw new ApiError(401, "Conform Password Is Wrong")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password Changed Successfully")
        )
})

const getCurruntUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "Currunt User Featch Successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new Error("All Fields Are Required");
    }

    // const checkUsernameIsAvalibleOrNot = await User.findOne({username : username.toLowerCase()})
    

    

    // if(checkUsernameIsAvalibleOrNot){
    //     throw new ApiError("Username Is Already Taken")
    // }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, { user }, "Account Details Updated Successfully")
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar File Is Missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error While Uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.
        status(200)
        .json(
            new ApiResponse(200, user, "Avatar Updated Successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.files?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage File Is Missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error While Uploading CoverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res.
        status(200)
        .json(
            new ApiResponse(200, user, "Cover Image Updated Successfully")
        )
})

const subscibedToChannel = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    console.log(channelId);

    const isSunscribedOrNot = await Subscription.findOne({
        subscriber: new mongoose.Types.ObjectId(req.user?._id),
        channel: new mongoose.Types.ObjectId(channelId)
    })

    if (isSunscribedOrNot) {
        const addChannelToUnsubscribe = await Subscription.findByIdAndDelete(isSunscribedOrNot)

        if (!addChannelToUnsubscribe) {
            throw new ApiError(401, "Something Went Wrong While Subscribing")
        }

        res
            .status(200)
            .json(
                new ApiResponse(200,
                    addChannelToUnsubscribe,
                    "UnSubscribed Successfully"
                )
            )
    }
    else {
        const addToChannelSubscriber = await Subscription.create({
            subscriber: new mongoose.Types.ObjectId(req.user?._id),
            channel: new mongoose.Types.ObjectId(channelId),
        })

        if (!addToChannelSubscriber) {
            throw new ApiError(401, "Something Went Wrong While Subscribing")
        }
        res
            .status(200)
            .json(
                new ApiResponse(200,
                    addToChannelSubscriber,
                    "Subscribed Successfully"
                )
            )
    }
})

const getchannelDetails = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(401, "Invalid Username")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscibers"
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscibedTo"
            },
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscibers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscibedTo"
                },
                isSubscribde: {
                    $cond: {
                        if: { $in: [req.use?._id, "$subscibers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribde: 1
            }
            //print all the details
        }
    ])

    if (!channel?.length) {
        throw new ApiError(401, "Channel Does Not Exist")
    }

    res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User Chanel Fetched Successfully"
            )
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            $pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }

                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "User Watched History fetched Successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurruntUserPassword,
    getCurruntUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getchannelDetails,
    getWatchHistory,
    subscibedToChannel
}
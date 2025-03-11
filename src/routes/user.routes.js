import { Router } from "express"
import { loginUser, logoutUser, registerUser, refreshAccessToken, subscibedToChannel, getchannelDetails, updateAccountDetails, changeCurruntUserPassword, updateUserAvatar, updateUserCoverImage, getCurruntUser, getWatchHistory } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routs
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/changeCurruntUserPassword").post(verifyJWT, changeCurruntUserPassword)
router.route("/subscibedToChannel/:channelId").post(verifyJWT, subscibedToChannel)

//patch Route
router.route("/updateAccountDetails").patch(verifyJWT, updateAccountDetails)
router.route("/updateUserAvatar").patch(verifyJWT, upload.single("avatar"),updateUserAvatar)
router.route("/updateUserCoverImage").patch(verifyJWT, upload.fields("coverImage"),updateUserCoverImage)

//get route
router.route("/getchannelDetails/:username").get(verifyJWT, getchannelDetails)
router.route("/getCurruntUser").get(verifyJWT, getCurruntUser)
router.route("/getWatchHistory").get(verifyJWT, getWatchHistory)



export default router 
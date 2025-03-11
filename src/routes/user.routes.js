import { Router } from "express"
import { loginUser, logoutUser, registerUser, refreshAccessToken,subscibedToChannel,getchannelDetails,updateAccountDetails,changeCurruntUserPassword } from "../controllers/user.controller.js"
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
router.route("/updateAccountDetails").post(verifyJWT,updateAccountDetails)
router.route("/changeCurruntUserPassword").post(verifyJWT,changeCurruntUserPassword)
router.route("/subscibedToChannel/:channelId").post(verifyJWT,subscibedToChannel)
router.route("/getchannelDetails/:username").get(verifyJWT,getchannelDetails)


export default router 
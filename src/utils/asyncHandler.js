const asyncHandler = (requestHandler) => {
    (req,res,next) => {
        //next is use to middleware
        Promise.resolve(
            requestHandler(req,res,next)
        )
        .catch((error) => next(error))
    }
}

export {asyncHandler}



// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }


//higer order function - that function who treats fuction like parameter or return finction
// const asyncHnadler = () = {}
// const asyncHnadler = () => {()=> {}}
// const asyncHnadler = () = () => {}
// const asyncHnadler = () = async() => {} //if you want to make async function
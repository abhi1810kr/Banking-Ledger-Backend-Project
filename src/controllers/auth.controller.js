const userModel = require('../models/user.model')
const jwt = require('jsonwebtoken')
const emailService = require('../services/email.service')
const tokenBlacklistModel = require('../models/blackList.model')


// user register controller

async function userRegisterController(req, res){

    const {email, password, name} = req.body;

    const isExist = await userModel.findOne({
        email:email
    })

    if(isExist){
        return res.status(422).json({
            message:"Email already exists",
            status:"Failed"
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign({userId:user._id}, process.env.JWT_SECRET, {expiresIn:"3d"})

    res.cookie("token", token)

    res.status(201).json({
        message:"User created successfully",
        token,
        user:{
            _id:user._id,
            email:user.email,
            name:user.name
        }
    })

    await emailService.sendRegistrationEmail(email, name);


}

// user login controller

async function userLoginController(req, res) {
    
    const {email, password} = req.body;

    const user = await userModel.findOne({
        email:email
    }).select("+password")

    if(!user){
        return res.status(401).json({
            message:"Wrong credentials"
        })
    }

    const isValidPassword = await user.comparePassword(password)

    if(!isValidPassword){
        return res.status(401).json({
            message:"Wrong credentials"
        })
    }

    const token = jwt.sign({userId:user._id}, process.env.JWT_SECRET, {expiresIn:"3d"})

    res.cookie("token", token)

    res.status(200).json({
        message:"User logged in successfully",
        token,
        user:{
            _id:user._id,
            email:user.email,
            name:user.name
        }
    })

}

// user logout controller

async function userLogoutController(req, res){
    const { token } = req.cookies || req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(400).json({
            message:"User logged out successfully"
        })
    }

    await tokenBlacklistModel.create({
        token:token
    })

    res.clearCookie("token")

    return res.status(200).json({
        message:"User logged out successfully"
    })

}


module.exports = {userRegisterController, userLoginController, userLogoutController}
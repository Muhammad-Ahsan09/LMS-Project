import { clerkClient } from "@clerk/express";

// Middleware (Protect Educator Routes)

export const protectEducator  = async (req, res, next) => {
    try {
        const userId = req.auth().userId

        const response = await clerkClient.users.getUser(userId)

        if (response.publicMetadata.role !== 'Educator') {
            res.json({success: false, message: "unauthorized access"})
        }

        next()
        
    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}
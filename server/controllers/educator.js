import {clerkClient} from "@clerk/express"

export const updateRoleToEducator = async (req, res) => {
    try {
        const userId = req.auth.userId

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: "Educator"
            }
        })
        
        res.json({success: true, message: "You can publish a new course"})
    } catch (error) {
        res.json({success: false, message: error.message})
        console.log(error.message)
    }
}
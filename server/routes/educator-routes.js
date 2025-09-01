import express from "express"
import { updateRoleToEducator, addCourse, getEducatorCourses, educatorDashboardData, getEnrolledStudentsData } from "../controllers/educator.js"
import upload from "../configs/multer.js"
import {protectEducator} from "../middlewares/authmiddleware.js"


const educatorRouter = express.Router()


// Add Educator Role
educatorRouter.get("/update-role", updateRoleToEducator)
educatorRouter.post("/add-course", upload.single("image"), protectEducator, addCourse)
educatorRouter.get('/courses', protectEducator, getEducatorCourses)
educatorRouter.get('/dashboard', protectEducator, educatorDashboardData)
educatorRouter.get('/enrolled-students', protectEducator, getEnrolledStudentsData)

// const courseData = {
//     "courseTitle": "Test course title",
//     "courseDescrition" : "test course description",
//     "coursePrice": 50,
//     "discount": 10,
//     "courseContent": [
//         {
//             "chapterId": "ch01",
//             "chapterOrder": 1,
//             "chapterTitle": "test chapter title",
//             "chapterContent": [
//                 {
//                         "lectureId": "lecture1",
//                         "lectureTitle": "test lecture title",
//                         "lectureDuration": 16,
//                         "lectureUrl": "https://example.com/lectures/lec01.mp4",
//                         "isPreviewFree": true,
//                         "lectureOrder": 1
//                 }
//             ]
//         }
//     ]
// }


export default educatorRouter

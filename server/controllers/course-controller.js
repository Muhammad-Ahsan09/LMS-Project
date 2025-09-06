import Stripe from "stripe";
import pool from "../database.js";
import dotenv from "dotenv"

dotenv.config()

// Get All courses
export const getAllCourses = async (req, res) => {
    try {
        let result = await pool.query(`
        SELECT courses.id, "coursePrice", "courseTitle", "courseDescription", "courseThumbnail",
        "isPublished", "discount", "educator" as educatorId, name, email, imageurl
        FROM courses 
        JOIN users ON courses.educator = users.id
        WHERE "isPublished" = $1;`, [true])

        const courses = result.rows
        
        courses.forEach((course) => {
            
            course.educator = {
                id : course.educatorid,
                name : course.name,
                email : course.email,
                imageUrl : course.imageurl,
            }
            
        })

        const course_ids = courses.map((course) => course.id)

        result = await pool.query(`SELECT * FROM courses_ratings WHERE course_id = ANY($1)`, [course_ids])
        let ratings = result.rows

        result = await pool.query(`
        SELECT * FROM is_enrolled_in
        JOIN users ON is_enrolled_in.user_id = users.id
        WHERE course_id = ANY($1);`, [course_ids])

        const enrolledStudents = result.rows


        result = await pool.query(`SELECT * FROM chapters WHERE course_id =ANY($1);`, [course_ids])
        const chapters = result.rows

        const chapter_ids = chapters.map(chapter => chapter.chapterId)

        result = await pool.query(`SELECT * FROM lectures WHERE chapter_id = ANY($1);`,[chapter_ids])
        const lectures = result.rows


        courses.forEach((course) => {
            course.courseRatings = []
            course.enrolledStudents = []
            course.courseContent = []


            chapters.forEach(chapter => {
                if(chapter.course_id === course.id) {
                    course.courseContent.push(chapter)
                }
                
            })

            course.courseContent.forEach(chapter => {
                chapter.chapterContent = []
                    lectures.forEach(lecture => {
                    
                    if(lecture.chapter_id === chapter.chapterId) {
                        chapter.chapterContent.push(lecture)
                    }
                })
            })
            
            ratings.forEach(rating => {
                if(rating.course_id === course.id) {
                    course.courseRatings.push(rating)
                    const index = ratings.indexOf(rating)
                    ratings.splice(index)
                }
            })

            enrolledStudents.forEach((student) => {
                if (student.course_id === course.id) {
                    course.enrolledStudents.push(student)
                }
            })
            
        })


        res.json({success: true, courses})

    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}

// Get course by id

export const getCourseId = async (req, res) => {
    try {
        const id = Number(req.params.id)
        
        // Getting courses

        let result = await pool.query(`
        SELECT courses.id, "courseTitle", "courseDescription", "courseThumbnail",
        "isPublished", "coursePrice", "discount", "educator" as educatorId, name, email, imageurl
        FROM courses 
        JOIN users ON courses.educator = users.id
        WHERE courses.id = $1;
        `, [id])


        const course = result.rows[0]
            
        course.educator = {
            id : course.educatorid,
            name : course.name,
            email : course.email,
            imageUrl : course.imageurl,
        }

        result = await pool.query(`
        SELECT * FROM is_enrolled_in
        JOIN users ON is_enrolled_in.user_id = users.id
        WHERE course_id = $1;`, [course.id])

        const enrolledStudents = result.rows

        result = await pool.query(`SELECT * FROM courses_ratings WHERE course_id = $1`, [course.id])
        let ratings = result.rows

        result = await pool.query(`SELECT * FROM chapters WHERE course_id = $1;`, [course.id])
        const chapters = result.rows
        
        const chapter_ids = chapters.map(chapter => chapter.chapterId)

        console.log("chapter_ids:", chapter_ids)

        result = await pool.query(`SELECT * FROM lectures WHERE chapter_id = ANY($1);`, [chapter_ids])
        const lectures = result.rows

        console.log("lectures: ", lectures)

        course.courseRatings = ratings
        course.enrolledStudents = []
        course.courseContent = []


        chapters.forEach(chapter => {
            chapter.chapterContent = []
            if(chapter.course_id === course.id) {
                course.courseContent.push(chapter)
            }
            
        })

        course.courseContent.forEach((chapter) => {
            lectures.forEach(lecture => {
                if(lecture.chapter_id == chapter.chapterId) {
                    chapter.chapterContent.push(lecture)
                }
            })
        })

        enrolledStudents.forEach((student) => {
            if (student.course_id === course.id) {
                course.enrolledStudents.push(student)
            }
        })


        const courseData = course

        courseData.courseContent.forEach((chapter) => {
            chapter.chapterContent.forEach((lecture) => {
                if(!lecture.isPreviewFree) {
                    lecture.lectureUrl = ""
                }
            })
        })

        console.log("courseData: ", courseData)

        res.json({success: true, courseData})
      

        // chapters.forEach(chapter => {
            
                
        // })
            
            // ratings.forEach(rating => {
            //     if(rating.course_id === course.id) {
            //         course.courseRatings.push(rating)
            //         const index = ratings.indexOf(rating)
            //         ratings.splice(index)
            //     }
            // })

        

        // Getting chapters of the courses
        // await Promise.all(
        //     courses.map( async (course) => {
        //         const courseChapters = await pool.query(`
        //         SELECT * FROM chapters WHERE course_id = $1;
        //         `, [course.id])

        //         // Getting studente enrolled in a course
        //         const enrolledStudents = await pool.query(`
        //         SELECT * FROM is_enrolled_in WHERE course_id = $1;
        //         `,[course.id])

        //         course.courseContent = [...courseChapters.rows]
        //         course.enrolledStudents = enrolledStudents.rows
        //     })
        // )

        
        
        // Getting lectures of the chapters
        // await Promise.all(
        //     courses.map(async (course) => {
        //         await Promise.all(
        //             course.courseContent.map( async (chapter) => {
        //                 const chapterLectures = await pool.query(`
        //                 SELECT * FROM lectures WHERE "chapter_id" = $1
        //                 `, [chapter.chapterId])

        //                 chapter.chapterContent = chapterLectures.rows
        //             })
        //         )
        //     })
        // )

        // Get the only course in the array which is at the index 0
        

        // Remove lecture url if isPreview is false

        

    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}



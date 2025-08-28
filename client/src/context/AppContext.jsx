import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import humanizeDuration from "humanize-duration";

export const AppContext = createContext()

export const AppContextProvider = ({children}) => {

    const currency = import.meta.env.VITE_CURRENCY

    const [allCourses, setAllCourses] = useState([])
    const [isEducator, setIsEducator] = useState(true)
    const [enrolledCourses, setEnrolledCourses] = useState([])

    const fetchAllCourses = async () => {
        setAllCourses(dummyCourses)
    }

    // Calculating average rating for course
    const calculateAverageRating = (course) => {
        if(course.courseRatings.length === 0) {
            return 0;
        }

        let totalRating = 0
        course.courseRatings.forEach((rating) => {
            totalRating += rating.rating
        })

        return totalRating / course.courseRatings.length
    }

    // calculating chapter duration

    const calulateChapterTime = (chapter) => {
        let time = 0
        chapter.chapterContent.forEach((lecture) => {
            time += lecture.lectureDuration
        })

        return humanizeDuration(time * 60 * 1000, {units: ["h", "m"]})
    }

    // calculate course duration
    const caluclateCourseDuration = (course) => {
        let time = 0

        course.courseContent.forEach((chapter) => {
            chapter.chapterContent.forEach((lecture) => {
                time += lecture.lectureDuration
            })
        })
        return humanizeDuration(time * 60 * 1000, {units: ["h", "m"]})
    }

    const calculateNumberOfLectures = (course) => {
        let totalLectures = 0;

        course.courseContent.forEach((chapter) => {
            if( Array.isArray(chapter.chapterContent) ) {
                totalLectures += chapter.chapterContent.length
            }
        })

        return totalLectures
    }

    // Fetch user enrolled courses
    const fetchUserEnrolledCourses = () => {
        setEnrolledCourses(dummyCourses)
    }




    useEffect(() => {
        fetchAllCourses()
    }, [])


    const value = {
        currency, allCourses, calculateAverageRating, isEducator, setIsEducator,
        calulateChapterTime, caluclateCourseDuration, calculateNumberOfLectures,
        enrolledCourses, fetchUserEnrolledCourses

    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}
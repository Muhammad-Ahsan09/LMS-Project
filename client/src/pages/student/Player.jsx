import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import humanizeDuration from 'humanize-duration'
import { assets } from '../../assets/assets'
import Youtube from "react-youtube"
import Footer from '../../components/student/Footer'
import Rating from '../../components/student/Rating'

const Player = () => {

  const {courseId} = useParams()
  const {enrolledCourses, calulateChapterTime} = useContext(AppContext)

  const [courseData, setCourseData] = useState(null)
  const [openSections, setOpenSections] = useState({})
  const [playerData, setPlayerData] = useState(false)

  const getCourseData = async () => {
    const foundCourse = enrolledCourses.find((course) => (course._id == courseId))
    setCourseData(foundCourse)
  }

  const toggleSection = (index) => {
    setOpenSections((prev) => (
      {
        ...prev,
        [index]: !prev[index]
      }
    ))
  }

  useEffect(() => {
    getCourseData()
  }, [enrolledCourses])


  return (
    
    <>
      <div className='p-4 sm:p-4 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36'>
        {/* Left column */}
        <div className='text-gray-800'>
          <h2 className='text-xl font-semibold'>Course Structure</h2>
          <div className='pt-5'>

            {
              courseData && courseData.courseContent.map((chapter, index) => (
                <div key={index} className='border border-gray-300 bg-white mb-2 rounded transition-all '>

                  <div className='flex items-center justify-between px-4 py-3 cursor-pointer select-none'
                    onClick={() => { toggleSection(index) }}
                  >

                    <div className='flex items-center gap-2'>
                      <img src={assets.down_arrow_icon} alt="Arrow Icon"
                        className={`transform transition-transform ${openSections[index] ? 'rotate-180' : ""} `}
                      />
                      <p className='font-medium md:text-base text-sm'>{chapter.chapterTitle}</p>
                    </div>
                    <p className='text-sm md:text-default'>{chapter.chapterContent.length} lectures - {calulateChapterTime(chapter)}</p>
                  </div>

                  <div className={`overflow-hidden transition-all duration 3000
                    ${openSections[index] ? 'max-h-96' : 'max-h-0'}
                  `}>
                    <ul className='list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600'>
                      {
                        chapter.chapterContent.map((lecture, i) => (
                          
                          <li key={i} className='flex items-start gap-2 py-1'>
                            <img src={assets.play_icon} alt="" />
                            <div className='flex items-center justify-between w-full text-gray-800 text-xs
                            md:text-default'>
                              <p>{lecture.lectureTitle}</p>
                              <div className='flex gap-2'>
                                {
                                  lecture.lectureUrl  && <p onClick={() => {setPlayerData({
                                    ...lecture, chapter: index + 1, lecture : i + 1
                                  })}}
                                  className='text-blue-500 cursor-pointer'>Watch</p>
                                }
                                <p>{humanizeDuration(lecture.lectureDuration * 60 * 1000)}</p>
                              </div>
                            </div>
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                </div>
              ))
            }
          </div>

          <div className='flex items-center gap-2 py-3 mt-10'>
            <h1 className='text-xl font-bold'>Rate this Course:</h1>
            <Rating initialRating={0} />
          </div>
        </div>


        {/* Right Column */}
        
        <div>
          {
            playerData ?
            <div className='md:mt-10'>
              <Youtube videoId={playerData.lectureUrl.split("/").pop()} opts={{playerVars: {
                autoplay: 1}}} iframeClassName='w-full aspect-video'/>
                <div className='flex justify-between items-center mt-1'>
                  <p>{playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}</p>
                  <button className='text-blue-600'>{false ? "Completed" : "Mark Complete"}</button>
                </div>
            </div>
            :
            <img src={ courseData ? courseData.courseThumbnail : ""} alt="" />
          }
          
        </div>
      </div>
      <Footer />
    </>
  )
}

export default Player

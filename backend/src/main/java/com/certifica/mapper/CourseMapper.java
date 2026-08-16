package com.certifica.mapper;

import com.certifica.domain.Course;
import com.certifica.dto.response.CourseResponse;
import org.springframework.stereotype.Component;

@Component
public class CourseMapper {

    public CourseResponse toResponse(Course course) {
        return new CourseResponse(
                course.getId(),
                course.getInstitution().getId(),
                course.getInstitution().getName(),
                course.getName(),
                course.getHours(),
                course.getCreatedAt()
        );
    }
}

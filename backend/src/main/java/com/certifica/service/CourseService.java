package com.certifica.service;

import com.certifica.domain.Course;
import com.certifica.domain.Institution;
import com.certifica.dto.request.CourseRequest;
import com.certifica.exception.ResourceNotFoundException;
import com.certifica.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CourseService {

    private final CourseRepository repository;
    private final InstitutionService institutionService;

    public CourseService(CourseRepository repository, InstitutionService institutionService) {
        this.repository = repository;
        this.institutionService = institutionService;
    }

    @Transactional(readOnly = true)
    public List<Course> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Course findById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado: " + id));
    }

    @Transactional
    public Course create(CourseRequest request) {
        Institution institution = institutionService.findById(request.institutionId());
        Course course = Course.builder()
                .institution(institution)
                .name(request.name())
                .hours(request.hours())
                .build();
        return repository.save(course);
    }

    @Transactional
    public Course update(UUID id, CourseRequest request) {
        Course course = findById(id);
        Institution institution = institutionService.findById(request.institutionId());
        course.setInstitution(institution);
        course.setName(request.name());
        course.setHours(request.hours());
        return repository.save(course);
    }

    @Transactional
    public void delete(UUID id) {
        repository.delete(findById(id));
    }
}

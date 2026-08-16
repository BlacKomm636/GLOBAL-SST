import apiClient from './client';
import type { Course } from '../types';

export interface CourseInput {
  institutionId: string;
  name: string;
  hours?: number;
}

export const listCourses = () => apiClient.get<Course[]>('/courses').then((r) => r.data);
export const createCourse = (input: CourseInput) => apiClient.post<Course>('/courses', input).then((r) => r.data);
export const deleteCourse = (id: string) => apiClient.delete(`/courses/${id}`);

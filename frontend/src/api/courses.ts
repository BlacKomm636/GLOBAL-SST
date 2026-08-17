import { supabase } from './supabaseClient';
import type { Course } from '../types';

export interface CourseInput {
  institutionId: string;
  name: string;
  hours?: number;
}

interface CourseRow {
  id: string;
  institution_id: string;
  institution: { name: string } | null;
  name: string;
  hours: number | null;
  created_at: string;
}

function mapRow(row: CourseRow): Course {
  return {
    id: row.id,
    institutionId: row.institution_id,
    institutionName: row.institution?.name ?? '',
    name: row.name,
    hours: row.hours ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('course').select('*, institution(name)').order('name');
  if (error) throw error;
  return (data as unknown as CourseRow[] ?? []).map(mapRow);
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const { data, error } = await supabase
    .from('course')
    .insert({ institution_id: input.institutionId, name: input.name, hours: input.hours ?? null })
    .select('*, institution(name)')
    .single();
  if (error) throw error;
  return mapRow(data as unknown as CourseRow);
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('course').delete().eq('id', id);
  if (error) throw error;
}

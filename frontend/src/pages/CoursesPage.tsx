import { useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import type { Course, Institution } from '../types';
import { createCourse, deleteCourse, listCourses } from '../api/courses';
import { listInstitutions } from '../api/institutions';

export default function CoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState('');
  const [name, setName] = useState('');
  const [hours, setHours] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [courses, insts] = await Promise.all([listCourses(), listInstitutions()]);
    setItems(courses);
    setInstitutions(insts);
    if (!institutionId && insts.length > 0) setInstitutionId(insts[0].id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createCourse({ institutionId, name, hours: hours === '' ? undefined : hours });
      setName('');
      setHours('');
      await refresh();
    } catch {
      setError('No se pudo crear el curso');
    }
  }

  async function handleDelete(id: string) {
    await deleteCourse(id);
    await refresh();
  }

  return (
    <div>
      <Helmet>
        <title>Cursos · Certifica</title>
      </Helmet>
      <h1>Cursos</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="field">
            <label>Institucion</label>
            <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Nombre del curso</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Horas</label>
            <input type="number" value={hours} onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <button className="btn-primary" type="submit">Crear</button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <table>
        <thead>
          <tr><th>Curso</th><th>Institucion</th><th>Horas</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.institutionName}</td>
              <td>{c.hours ?? '-'}</td>
              <td><button onClick={() => handleDelete(c.id)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

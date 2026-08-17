import { useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import type { Institution } from '../types';
import { createInstitution, deleteInstitution, listInstitutions } from '../api/institutions';

export default function InstitutionsPage() {
  const [items, setItems] = useState<Institution[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setItems(await listInstitutions());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createInstitution({ name, slug });
      setName('');
      setSlug('');
      await refresh();
    } catch {
      setError('No se pudo crear la institucion (verifica que el slug sea unico)');
    }
  }

  async function handleDelete(id: string) {
    await deleteInstitution(id);
    await refresh();
  }

  return (
    <div>
      <Helmet>
        <title>Instituciones · Certifica</title>
      </Helmet>
      <p className="eyebrow" style={{ marginBottom: 4 }}>Panel administrador</p>
      <h1>Instituciones</h1>

      <div className="card" style={{ marginBottom: 24, marginTop: 16 }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Nombre</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Slug (unico)</label>
            <input className="mono" required value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <button className="btn-primary" type="submit" style={{ marginBottom: 14 }}>Crear</button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <table>
        <thead>
          <tr><th>Nombre</th><th>Slug</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td className="mono">{i.slug}</td>
              <td><button className="btn-secondary" onClick={() => handleDelete(i.id)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

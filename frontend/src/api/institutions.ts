import { supabase } from './supabaseClient';
import type { Institution } from '../types';

export interface InstitutionInput {
  name: string;
  slug: string;
  logoUrl?: string;
}

interface InstitutionRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

function mapRow(row: InstitutionRow): Institution {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listInstitutions(): Promise<Institution[]> {
  const { data, error } = await supabase.from('institution').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createInstitution(input: InstitutionInput): Promise<Institution> {
  const { data, error } = await supabase
    .from('institution')
    .insert({ name: input.name, slug: input.slug, logo_url: input.logoUrl ?? null })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteInstitution(id: string): Promise<void> {
  const { error } = await supabase.from('institution').delete().eq('id', id);
  if (error) throw error;
}

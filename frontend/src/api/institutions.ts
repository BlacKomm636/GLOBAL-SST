import apiClient from './client';
import type { Institution } from '../types';

export interface InstitutionInput {
  name: string;
  slug: string;
  logoUrl?: string;
}

export const listInstitutions = () => apiClient.get<Institution[]>('/institutions').then((r) => r.data);
export const createInstitution = (input: InstitutionInput) =>
  apiClient.post<Institution>('/institutions', input).then((r) => r.data);
export const deleteInstitution = (id: string) => apiClient.delete(`/institutions/${id}`);

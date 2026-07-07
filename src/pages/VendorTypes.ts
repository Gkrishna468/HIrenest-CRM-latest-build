/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Recruiter 1' | 'Recruiter 2' | 'Delivery Manager' | 'Finance' | 'HR';
  status: 'active' | 'inactive' | 'pending';
  lastActive: string;
  permissions: string[];
}

export interface CandidateVersion {
  version: string;
  updatedAt: string;
  size: string;
  author: string;
  sha256: string;
  isCurrent: boolean;
}

export interface CandidateOwnershipTimeline {
  event: string;
  timestamp: string;
  notes: string;
}

export interface CandidateHealthScore {
  overall: number;
  completeness: number;
  skillConfidence: number;
  parseConfidence: number;
  contactValidation: number;
  duplicateRisk: number;
  availabilityConfidence: number;
}

export interface InvoiceRecord {
  id: string;
  date: string;
  candidateName: string;
  client: string;
  budget: number;
  commission: number;
  status: 'PAID' | 'PENDING' | 'RISK ALERT';
  dueDate: string;
  notes?: string;
}

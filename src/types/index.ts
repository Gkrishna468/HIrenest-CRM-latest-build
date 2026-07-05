/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'founder' | 'client_manager' | 'vendor_manager' | 'recruiter' | 'manager' | 'vendor' | 'client' | 'viewer';

export interface Company {
  id: string;
  name: string;
  type: 'client' | 'vendor' | 'internal';
  createdAt: string;
}

export interface Agreement {
  id: string;
  companyId: string;
  type: 'MSA' | 'NDA';
  fileUrl: string;
  status: 'pending' | 'signed' | 'expired';
  signedAt?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId?: string;
  avatar?: string;
  phone?: string;
  status: 'active' | 'inactive';
  gmailConnected?: boolean;
  gmailEmail?: string;
  gmailConnectionId?: string;
  loginCount?: number;
  mustChangePassword?: boolean;
  temporaryPassword?: string;
}

export interface Client {
  id: string;
  source?: "crm" | "os" | "mailos" | "vendor" | "manual";
  company: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  industry?: string;
  budget?: string;
  contactPerson?: string;
  website?: string;
  clientCode?: string;
  notes?: string;
  userId?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  source?: "crm" | "os" | "mailos" | "vendor" | "manual";
  name: string;
  type: 'vendor' | 'recruiter';
  company?: string;
  email?: string;
  phone?: string;
  location?: string;
  specialization?: string[];
  isRecruiter?: boolean;
  recruiterCompany?: string;
  vendorCode?: string;
  broadcastsReceived?: number;
  responses?: number;
  profilesShared?: number;
  responseRate?: string;
  userId?: string;
  companyId?: string;
  organizationId?: string;
  status?: 'active' | 'inactive';
  secretKey?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  companyId: string;
  source?: "crm" | "os" | "mailos" | "vendor" | "manual";
  title: string;
  description: string;
  location: string;
  type: string;
  salary?: string;
  budget: number | any;
  adjustedBudget?: number;
  skills: string[];
  experienceRequired?: string;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: 'Annual CTC' | 'Monthly CTC' | 'Hourly' | 'Daily' | 'Fixed' | 'Negotiable';
  openings?: number;
  submissionsCount?: number;
  status: 'open' | 'closed' | 'filled' | 'pending';
  approvalStatus?: string;
  broadcastToVendors?: boolean;
  broadcastsSent?: number;
  vendorResponses?: number;
  clientId?: string;
  clientName?: string;
  userId?: string;
  closedDate?: string;
  createdAt: string;
  updatedAt: string;

  // Nice-to-have fields:
  workMode?: 'Remote' | 'Hybrid' | 'Onsite';
  noticePeriod?: string;
  shiftTiming?: string;
  interviewMode?: string;
  interviewRounds?: number;
  joiningTimeline?: string;
  education?: string;
  certifications?: string;
  visaAuthorization?: string;
  replacementPeriod?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';

  // Publish settings:
  publishTo?: {
    vendorPortal?: boolean;
    clientPortal?: boolean;
    whatsApp?: boolean;
    linkedIn?: boolean;
    internalRecruiters?: boolean;
    emailCampaign?: boolean;
  };

  // Versioning and Audit Log
  versions?: Array<{
    version: number;
    updatedAt: string;
    updatedBy: string;
    title: string;
    description: string;
    location: string;
    skills: string[];
    experienceMin?: number;
    experienceMax?: number;
    salaryMin?: number;
    salaryMax?: number;
    salaryType?: string;
    budget?: any;
    priority?: string;
  }>;

  changeLog?: Array<{
    timestamp: string;
    actor: string;
    action: string;
    details: string;
    changes?: Record<string, { from: any; to: any }>;
  }>;

  pendingUpdates?: Partial<Job>;
}

export interface Candidate {
  id: string;
  source?: "crm" | "os" | "mailos" | "vendor" | "manual" | "resume";
  vendorCompanyId?: string;
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  experience: number | string;
  yearsExperience?: number;
  currentCompany?: string;
  currentTitle?: string;
  expectedSalary?: string;
  location?: string;
  status?: string;
  stage: string;
  vendorId?: string;
  vendorName?: string;
  vendorCode?: string;
  clientId?: string;
  jobId?: string;
  jobTitle?: string;
  resumeUrl?: string;
  notes?: string;
  aiMatchScore?: number;
  assignedBdm?: string;
  fraudDetected?: boolean;
  userId?: string;
  companyId?: string;
  organizationId?: string;
  ownerType?: 'Vendor' | 'Client' | 'Staffing';
  ownerUserId?: string;
  submittedVia?: string;
  ownershipLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Resume {
  id: string;
  fileName: string;
  candidateId?: string;
  candidateName?: string;
  extractedText?: string;
  parsedData?: any;
  extractedSkills?: string[];
  source: 'direct' | 'gmail' | 'portal';
  url?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  entityType: 'client' | 'vendor' | 'candidate' | 'job' | 'recruiter';
  entityId: string;
  entityName?: string;
  message: string;
  status: 'pending' | 'completed';
  dueDate: string;
  userId?: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  jobId: string;
  candidateId: string;
  vendorId?: string;
  clientId: string;
  clientName: string;
  jobTitle: string;
  candidateName: string;
  status: 'prospect' | 'sourcing' | 'submitted' | 'interview' | 'offered' | 'placed' | 'paid';
  offeredCtc?: number;
  finalCtc: number;
  commissionPercent: number;
  revenueAmount: number;
  vendorShare: number;
  payoutAmount: number;
  profitAmount: number;
  paymentReceived: boolean;
  joinedDate?: string;
  userId?: string;
  createdAt: string;
  revenue_amount?: number; // compat
}

export interface Submission {
  id: string;
  jobId: string;
  candidateId: string;
  vendorId?: string;
  candidateName: string;
  jobTitle: string;
  status: 'submitted' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected';
  notes?: string;
  userId?: string;
  createdAt: string;
}

export interface Collaboration {
  id: string;
  jobId: string;
  candidateId: string;
  vendorId: string;
  clientId: string;
  status: 'proposed' | 'collaborated' | 'interviewing' | 'rejected' | 'placed';
  matchScore: number;
  clientFeedback?: string;
  vendorNotes?: string;
  lastActivityAt: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  collaborationId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isAiAssisted: boolean;
  createdAt: string;
}

export interface AgentLog {
  id: string;
  type: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  metadata?: any;
  createdAt: string;
}

export interface MatchResult {
  score: number;
  reasoning: string;
  gaps: string[];
  recommendation: 'shortlist' | 'reserve' | 'reject';
  missing_info: string[];
}

export interface GmailConnection {
  id: string; // The user's UID ideally or a generated ID
  userId: string;
  email: string;
  status: 'active' | 'disconnected' | 'error';
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  connectionId: string;
  historyId: string;
  internalDate: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  bodyPlain?: string;
  bodyHtml?: string;
  hasAttachment: boolean;
  status: 'unread' | 'read' | 'processed';
  createdAt: string;
}

export interface EmailThread {
  id: string;
  connectionId: string;
  historyId: string;
  snippet: string;
  messageCount: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface EmailAttachment {
  id: string;
  messageId: string;
  connectionId: string;
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string; // Google's attachmentId
  status: 'pending' | 'parsed' | 'failed';
  storageUrl?: string; // If we download it to Firebase Storage
  createdAt: string;
}

export interface EmailEntityLink {
  id: string;
  messageId: string;
  entityType: 'requirement' | 'vendor' | 'candidate' | 'client' | 'submission_batch';
  entityId: string;
  confidence: number;
  createdAt: string;
}

export interface VendorBroadcast {
  id?: string;
  broadcastId?: string;
  requirementId: string;
  requirementTitle?: string;
  channel: string; // 'whatsapp' | 'email' | 'linkedin'
  vendorId: string;
  vendorName?: string;
  sentAt: string;
  status: string; // 'sent' | 'delivered' | 'opened'
  source: string;
}

export interface VendorResponse {
  id?: string;
  responseId?: string;
  broadcastId?: string;
  requirementId: string;
  vendorId: string;
  responseType: string; // 'interested' | 'not_interested' | 'submitted'
  receivedAt: string;
  notes?: string;
}

export interface SubmissionLedger {
  id?: string;
  submissionId?: string;
  requirementId: string;
  candidateId: string;
  vendorId: string;
  ownershipHash: string;
  submittedAt: string;
  status: string;
}

export interface ActivityLedger {
  id?: string;
  entityType: string;
  entityId: string;
  event: string;
  performedBy: string;
  timestamp: string;
  metadata?: any;
}


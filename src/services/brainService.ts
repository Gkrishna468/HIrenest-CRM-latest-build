/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { safeString, safeArray } from "@/utils/safe";
import { auth } from "@/services/firebase/config";

export interface BrainInsight {
  profile: {
    intent: 'Requirement' | 'Vendor Submission' | 'Interview' | 'Offer' | 'Joining' | 'Invoice' | 'Spam' | 'Other';
    roles: string[];
    urgency: 'high' | 'medium' | 'low';
    budget: 'high' | 'mid' | 'low';
    sentiment: string;
  };
  pitch: string;
  followUp: {
    suggested: boolean;
    reason: string;
    timeline: string;
  };
  extractedRequirement?: {
    title: string;
    client?: string;
    location: string;
    experience: string;
    skills?: string[];
    employmentType: string;
    budget?: string;
    status: string;
  };
  extractedSubmission?: {
    candidateName: string;
    vendorName?: string;
    noticePeriod?: string;
    experience: string;
    skills: string[];
  };
  extractedInterview?: {
    candidateName: string;
    client: string;
    date: string;
    time: string;
    type: string;
  };
}

/**
 * The Unified AI Brain: Processes any interaction and returns full intelligence
 */
export async function processInteraction(text: string, context?: any, emailId?: string): Promise<BrainInsight> {
  try {
    let token = '';
    const execSession = localStorage.getItem('hirenest_exec_session');
    if (execSession) {
      token = 'executive-bypass-token';
    } else if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }

    const response = await fetch('/api/ai?action=classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ text, context, emailId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI service error:", response.status, errorText);
      throw new Error(`Failed to reach AI classification service: ${response.status} ${errorText}`);
    }

    const insight = await response.json();
    return insight;
  } catch (error) {
    console.error("Brain execution failed:", error);
    return {
      profile: { intent: 'Other', roles: [], urgency: 'low', budget: 'mid', sentiment: 'Neutral' },
      pitch: "I've received your message and will get back to you shortly.",
      followUp: { suggested: false, reason: "System processing issue", timeline: "N/A" }
    };
  }
}

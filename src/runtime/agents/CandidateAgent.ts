import { Firestore } from "firebase-admin/firestore";
import { AIProvider } from "../AIProvider";

export class CandidateAgent {
  static async execute(db: Firestore, payload: any) {
    const candidateId = payload.candidateId;
    if (!candidateId) throw new Error("Missing candidateId");

    // Also support submissionId if needed
    const candRef = db.collection("candidates").doc(candidateId);
    const doc = await candRef.get();
    
    if (!doc.exists) {
      throw new Error(`Candidate ${candidateId} not found`);
    }

    const data = doc.data() || {};
    // Extract info from resumeText or summary
    const textToAnalyze = `
      Name: ${data.name || ''}
      Email: ${data.email || ''}
      Resume Summary: ${data.summary || data.resumeText || ''}
    `;

    const schema = {
      type: "object",
      properties: {
        primarySkills: {
          type: "array",
          items: { type: "string" }
        },
        secondarySkills: {
          type: "array",
          items: { type: "string" }
        },
        totalExperienceYears: { type: "number" },
        normalizedTechStack: {
          type: "array",
          items: { type: "string" }
        },
        employmentType: { enum: ["Full-Time", "Contract", "Freelance", "Unknown"], type: "string" },
        candidateStrength: { type: "number", description: "1-100 indicating profile strength" },
        confidence: { type: "number", description: "1-100 confidence score" }
      },
      required: ["primarySkills", "candidateStrength", "confidence", "normalizedTechStack"]
    };

    const prompt = `Analyze the following candidate resume text and extract key capabilities, skills, and overall strength:\n\n${textToAnalyze}`;

    const jsonStr = await AIProvider.generateWithSchema(prompt, schema);
    const result = JSON.parse(jsonStr);

    await candRef.update({
      aiExtractedData: result,
      status: "processed",
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      candidateStrength: result.candidateStrength,
      primarySkills: result.primarySkills,
      secondarySkills: result.secondarySkills
    };
  }
}

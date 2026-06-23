import { Firestore } from "firebase-admin/firestore";
import { AIProvider } from "../AIProvider";

export class RequirementAgent {
  static async execute(db: Firestore, payload: any) {
    const requirementId = payload.requirementId;
    if (!requirementId) throw new Error("Missing requirementId");

    const reqRef = db.collection("requirements").doc(requirementId);
    const doc = await reqRef.get();
    
    if (!doc.exists) {
      throw new Error(`Requirement ${requirementId} not found`);
    }

    const data = doc.data() || {};
    const textToAnalyze = `
      Title: ${data.title || ''}
      Location: ${data.location || ''}
      Description: ${data.description || ''}
    `;

    const schema = {
      type: "object",
      properties: {
        extractedSkills: {
          type: "array",
          items: { type: "string" }
        },
        location: { type: "string" },
        budget: { type: "string" },
        noticePeriod: { type: "string" },
        priority: { enum: ["Low", "Medium", "High", "Critical"], type: "string" },
        requirementScore: { type: "number", description: "1-100 score indicating profile completeness/quality" },
        confidence: { type: "number", description: "1-100 confidence score" }
      },
      required: ["extractedSkills", "priority", "requirementScore", "confidence"]
    };

    const prompt = `Extract structured requirement data from the following text:\n\n${textToAnalyze}`;

    const jsonStr = await AIProvider.generateWithSchema(prompt, schema);
    const result = JSON.parse(jsonStr);

    await reqRef.update({
      aiExtractedData: result,
      status: "processed",
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      requirementScore: result.requirementScore,
      priority: result.priority,
      confidence: result.confidence
    };
  }
}

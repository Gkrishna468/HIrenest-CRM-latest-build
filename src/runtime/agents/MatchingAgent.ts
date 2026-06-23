import { Firestore } from "firebase-admin/firestore";
import { AIProvider } from "../AIProvider";

export class MatchingAgent {
  static async execute(db: Firestore, payload: any) {
    if (payload.requirementId) {
      return await this.matchRequirement(db, payload.requirementId);
    } else if (payload.candidateId) {
      return await this.matchCandidate(db, payload.candidateId);
    }
    throw new Error("Missing candidateId or requirementId");
  }

  private static async matchRequirement(db: Firestore, requirementId: string) {
    const reqRef = db.collection("requirements").doc(requirementId);
    const reqDoc = await reqRef.get();
    if (!reqDoc.exists) throw new Error("Requirement not found");
    const reqData = reqDoc.data() || {};
    
    // Fetch some candidates
    const candsSnap = await db.collection("candidates").limit(20).get();
    const matches: any[] = [];
    
    const reqStr = JSON.stringify(reqData.aiExtractedData || reqData);

    for (const candDoc of candsSnap.docs) {
      const candData = candDoc.data();
      const candStr = JSON.stringify(candData.aiExtractedData || candData);

      const prompt = `Match the requirement and the candidate. Return ONLY a JSON object with matches array.
      Requirement: ${reqStr}
      Candidate: ${candStr}
      `;

      const schema = {
        type: "object",
        properties: {
          matchScore: { type: "number", description: "Match score 1-100" },
          matchReasoning: { type: "string" }
        },
        required: ["matchScore", "matchReasoning"]
      };

      try {
        const jsonStr = await AIProvider.generateWithSchema(prompt, schema);
        const res = JSON.parse(jsonStr);
        if (res.matchScore > 50) {
           matches.push({
             candidateId: candDoc.id,
             requirementId,
             score: res.matchScore,
             reasoning: res.matchReasoning,
             createdAt: new Date().toISOString()
           });
        }
      } catch (err) {
        console.error("Match error", err);
      }
    }

    matches.sort((a,b) => b.score - a.score);
    const topMatches = matches.slice(0, 5);

    for (const match of topMatches) {
        await db.collection("matches").add(match);
    }

    return {
      success: true,
      matchesGenerated: topMatches.length,
      topScores: topMatches.map(m => m.score)
    };
  }

  private static async matchCandidate(db: Firestore, candidateId: string) {
    const candRef = db.collection("candidates").doc(candidateId);
    const candDoc = await candRef.get();
    if (!candDoc.exists) throw new Error("Candidate not found");
    const candData = candDoc.data() || {};
    
    // Fetch some open requirements
    const reqsSnap = await db.collection("requirements").limit(20).get();
    const matches: any[] = [];
    
    const candStr = JSON.stringify(candData.aiExtractedData || candData);

    for (const reqDoc of reqsSnap.docs) {
      const reqData = reqDoc.data();
      const reqStr = JSON.stringify(reqData.aiExtractedData || reqData);

      const prompt = `Match the requirement and the candidate. Return ONLY a JSON object with match score.
      Requirement: ${reqStr}
      Candidate: ${candStr}
      `;

      const schema = {
        type: "object",
        properties: {
          matchScore: { type: "number", description: "Match score 1-100" },
          matchReasoning: { type: "string" }
        },
        required: ["matchScore", "matchReasoning"]
      };

      try {
        const jsonStr = await AIProvider.generateWithSchema(prompt, schema);
        const res = JSON.parse(jsonStr);
        if (res.matchScore > 50) {
           matches.push({
             candidateId,
             requirementId: reqDoc.id,
             score: res.matchScore,
             reasoning: res.matchReasoning,
             createdAt: new Date().toISOString()
           });
        }
      } catch (err) {
        console.error("Match error", err);
      }
    }

    matches.sort((a,b) => b.score - a.score);
    const topMatches = matches.slice(0, 5);

    for (const match of topMatches) {
        await db.collection("matches").add(match);
    }

    return {
      success: true,
      matchesGenerated: topMatches.length,
      topScores: topMatches.map(m => m.score)
    };
  }
}

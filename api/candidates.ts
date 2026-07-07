import { VercelRequest, VercelResponse } from "@vercel/node";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config();

let db: Firestore | null = null;
let adminApp: any = null;

if (!getApps()?.length) {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId,
      });
    }
    db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
} else {
  adminApp = getApps()[0];
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  } catch(err) {
    db = getFirestore(adminApp);
  }
}

// Initialize Gemini Client
const apiKey = (process.env.GEMINI_API_KEY || "").replace(/^"|"$/g, "").replace(/^'|'$/g, "");
const ai = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.query;

  if (action === "submitVendorCandidate") {
    try {
      if (!db) throw new Error("Database not initialized");

      const { candidateHash, vendorId, candidateName, requirementId, identityData } = req.body;

      if (!candidateHash || !vendorId || !candidateName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check candidateOwnership
      const ownershipRef = db.collection("candidateOwnership");
      const existingQuery = await ownershipRef.where("candidateHash", "==", candidateHash).get();

      if (!existingQuery.empty) {
        const existing = existingQuery.docs[0].data();
        if (existing.vendorId !== vendorId) {
          return res.status(409).json({ 
            error: "Candidate Ownership Conflict", 
            message: `This profile is already owned by another entity across our network.` 
          });
        } else {
          return res.status(409).json({ 
            error: "Duplicate Submission", 
            message: `You have already claimed ownership of this profile.` 
          });
        }
      }

      // 1. Fetch Job / Requirement Details to perform BDM Routing & AI Screening
      let jobTitle = "General Talent Pool";
      let jobDescription = "Sourcing general talent pool candidates.";
      let jobSkills: string[] = [];
      let clientName = "Open Network";
      let jobLocation = "Remote";

      const reqId = requirementId || "UNKNOWN";

      if (reqId !== "UNKNOWN") {
        try {
          const jobDoc = await db.collection("requirements_private").doc(reqId).get();
          if (jobDoc.exists) {
            const jd = jobDoc.data();
            jobTitle = jd?.title || "Sourced Role";
            jobDescription = jd?.description || jd?.client || "";
            jobSkills = jd?.skills || [];
            clientName = jd?.client || "Enterprise Client";
            jobLocation = jd?.location || "Remote";
          } else {
            const pubDoc = await db.collection("requirements_public").doc(reqId).get();
            if (pubDoc.exists) {
              const jd = pubDoc.data();
              jobTitle = jd?.title || "Sourced Role";
              jobDescription = jd?.description || "";
              jobSkills = jd?.skills || [];
              clientName = jd?.client || "Enterprise Client";
              jobLocation = jd?.location || "Remote";
            }
          }
        } catch (err) {
          console.error("Error fetching requirement from Firestore:", err);
        }
      }

      // 2. Perform BDM Routing
      let assignedBdm = "Ravi"; // Default
      const lowerTitle = jobTitle.toLowerCase();
      const lowerDesc = jobDescription.toLowerCase();
      const lowerClient = clientName.toLowerCase();

      if (lowerClient.includes("deloitte") || lowerTitle.includes("deloitte") || lowerDesc.includes("deloitte")) {
        assignedBdm = "Rahul";
      } else if (lowerClient.includes("accenture") || lowerTitle.includes("accenture") || lowerDesc.includes("accenture")) {
        assignedBdm = "Priya";
      } else if (lowerDesc.includes("bangalore") || lowerDesc.includes("bengaluru") || jobLocation.toLowerCase().includes("bangalore")) {
        assignedBdm = "Priya";
      } else if (lowerTitle.includes("sap") || lowerDesc.includes("sap")) {
        assignedBdm = "Rahul";
      }

      // 3. Perform AI Resume Screening using Gemini
      let aiMatchScore = 75;
      let aiSummary = "Vetted profile awaiting BDM review.";
      let fraudDetected = false;
      let skillsList = identityData.skills || [];

      if (ai) {
        try {
          const evaluationPrompt = `
            Act as the Staffing Intelligence Analyzer for HireNestOS.
            Evaluate the candidate's details against the job requirement and return a structured JSON evaluation.

            CANDIDATE DETAILS:
            Name: ${candidateName}
            Email: ${identityData.email || ""}
            Phone: ${identityData.phone || ""}
            Current Title: ${identityData.current_title || ""}
            Skills Provided: ${JSON.stringify(identityData.skills || [])}
            Cover Note: ${identityData.cover_note || ""}

            JOB REQUIREMENT DETAILS:
            Title: ${jobTitle}
            Description: ${jobDescription}
            Required Skills: ${JSON.stringify(jobSkills)}

            TASK:
            1. Calculate a match percentage (0 to 100) based on skill overlap, experience level, and relevance.
            2. Formulate a 2-3 sentence AI candidate profile summary / evaluation.
            3. Detect potential fraud markers (disposable emails, mismatched phone numbers, or extreme text anomalies). Return fraudDetected as true or false.
            4. Extract skills list as a JSON array of strings.

            RETURN ONLY VALID JSON MATCHING THIS SCHEMA:
            {
              "matchScore": 85,
              "summary": "Evaluation text here",
              "fraudDetected": false,
              "skills": ["skill1", "skill2"]
            }
          `;

          const result = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: evaluationPrompt,
            config: {
              responseMimeType: "application/json",
            },
          });

          const cleanText = (result.text || "")
            .replace(/\`\`\`json|\`\`\`/g, "")
            .trim();
          const evaluation = JSON.parse(cleanText);

          if (evaluation.matchScore !== undefined) aiMatchScore = Number(evaluation.matchScore);
          if (evaluation.summary) aiSummary = evaluation.summary;
          if (evaluation.fraudDetected !== undefined) fraudDetected = !!evaluation.fraudDetected;
          if (Array.isArray(evaluation.skills)) skillsList = evaluation.skills;

        } catch (err) {
          console.error("Gemini processing failed, using fallbacks:", err);
        }
      }

      // Validate done - create ownership
      const payload = {
        candidateHash,
        vendorId,
        candidateName,
        createdAt: new Date().toISOString(),
        source: "vendor",
        identityData,
      };

      await ownershipRef.add(payload);
      
      // Create Firebase Candidates Pool
      const candRef = await db.collection("candidates").add({
        name: candidateName,
        vendorId: vendorId,
        vendor_company_id: vendorId,
        stage: "submission",
        source: "vendor_submit",
        created_at: new Date().toISOString(),
        assignedBdm,
        aiMatchScore,
        fraudDetected,
        notes: aiSummary,
        skills: skillsList,
        organizationId: vendorId,
        ownerType: "Vendor",
        ownerUserId: vendorId,
        submittedVia: "Vendor Portal",
        ownershipLocked: true,
        ...identityData
      });

      // Sync to candidatePool
      await db.collection("candidatePool").add({
        name: candidateName,
        vendorId: vendorId,
        stage: "submission",
        source: "vendor",
        createdAt: new Date().toISOString(),
        assignedBdm,
        aiMatchScore,
        fraudDetected,
        notes: aiSummary,
        skills: skillsList,
        organizationId: vendorId,
        ownerType: "Vendor",
        ownerUserId: vendorId,
        submittedVia: "Vendor Portal",
        ownershipLocked: true,
        ...identityData
      });

      // Add to submission_ledger
      await db.collection("submission_ledger").add({
        requirementId: reqId,
        candidateId: candRef.id,
        vendorId: vendorId,
        ownershipHash: candidateHash,
        submittedAt: new Date().toISOString(),
        status: "submitted",
        assignedBdm,
        aiMatchScore
      });

      // Add to activity_ledger
      await db.collection("activity_ledger").add({
        entityType: "candidate_submission",
        entityId: candRef.id,
        event: "candidate_submitted",
        performedBy: vendorId,
        timestamp: new Date().toISOString(),
        metadata: {
          vendorId,
          candidateHash,
          requirementId: reqId,
          assignedBdm,
          aiMatchScore
        }
      });

      // LAW 1: Log to immutable Company Ledger
      await db.collection("system_events").add({
        type: "CANDIDATE_SUBMITTED",
        message: `Vendor submitted candidate ${candidateName} for requirement ${jobTitle}. Assigned to BDM ${assignedBdm} (AI Match: ${aiMatchScore}%).`,
        timestamp: new Date().toISOString(),
        entityType: "candidate",
        entityId: candRef.id,
        role: "system",
        data: {
          candidateName,
          requirementId: reqId,
          vendorId,
          assignedBdm,
          aiMatchScore,
          fraudDetected
        }
      });

      return res.status(200).json({ 
        success: true, 
        candidateId: candRef.id,
        assignedBdm,
        aiMatchScore,
        fraudDetected,
        aiSummary
      });

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  } else if (action === "submitVendorCandidatePool") {
    try {
      if (!db) throw new Error("Database not initialized");

      const { candidateHash, vendorId, candidateName, identityData } = req.body;

      if (!candidateHash || !vendorId || !candidateName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 1. Check candidate_identity_vault for global double-submission lock (duplicate check)
      const vaultRef = db.collection("candidate_identity_vault");
      const existingQuery = await vaultRef.where("candidateHash", "==", candidateHash).get();

      if (!existingQuery.empty) {
        const existing = existingQuery.docs[0].data();
        if (existing.vendorId !== vendorId) {
          return res.status(409).json({ 
            error: "Candidate Ownership Conflict", 
            message: `This profile is already locked under prior registry claims by another vendor.` 
          });
        } else {
          return res.status(409).json({ 
            error: "Duplicate Submission", 
            message: `You have already registered this candidate in your global Talent Pool.` 
          });
        }
      }

      // 2. Perform AI screening/extraction with Gemini
      let parsedTitle = identityData.current_title || "Technical Specialist";
      let parsedSkills = identityData.skills || [];
      let parsedSummary = "Talent Pool asset available for redeployment.";
      let fraudDetected = false;

      if (ai) {
        try {
          const extractionPrompt = `
            Act as the Staffing Intelligence Analyzer for HireNestOS.
            Extract key parameters from this candidate profile.

            CANDIDATE:
            Name: ${candidateName}
            Title: ${identityData.current_title || ""}
            Skills: ${JSON.stringify(identityData.skills || [])}
            Notes: ${identityData.cover_note || ""}

            TASK:
            1. Suggest the best standardized Technical Job Title.
            2. Extract skills list as a JSON array of strings.
            3. Formulate a 2-3 sentence professional summary / profile highlights.
            4. Detect potential fraud markers (return true or false).

            RETURN ONLY VALID JSON:
            {
              "standardizedTitle": "e.g. Senior React Developer",
              "skills": ["skill1", "skill2"],
              "summary": "Summary text",
              "fraudDetected": false
            }
          `;

          const result = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: extractionPrompt,
            config: {
              responseMimeType: "application/json",
            },
          });

          const cleanText = (result.text || "")
            .replace(/\`\`\`json|\`\`\`/g, "")
            .trim();
          const parsed = JSON.parse(cleanText);

          if (parsed.standardizedTitle) parsedTitle = parsed.standardizedTitle;
          if (Array.isArray(parsed.skills)) parsedSkills = parsed.skills;
          if (parsed.summary) parsedSummary = parsed.summary;
          if (parsed.fraudDetected !== undefined) fraudDetected = !!parsed.fraudDetected;
        } catch (err) {
          console.error("Gemini pool extraction failed, using fallbacks:", err);
        }
      }

      // 3. Create document in candidate_identity_vault
      const vaultDoc = {
        candidateHash,
        vendorId,
        candidateName,
        ownershipLocked: true,
        createdAt: new Date().toISOString()
      };
      await vaultRef.add(vaultDoc);

      // 4. Create document in vendor_candidate_pool
      const poolRef = await db.collection("vendor_candidate_pool").add({
        name: candidateName,
        vendorId,
        stage: "Available",
        currentTitle: parsedTitle,
        skills: parsedSkills,
        createdAt: new Date().toISOString(),
        notes: parsedSummary,
        fraudDetected,
        ...identityData
      });

      // 5. Create document in candidate_versions
      await db.collection("candidate_versions").add({
        candidateId: poolRef.id,
        resumeUrl: identityData.resume_url || "",
        parsedSkills,
        updatedAt: new Date().toISOString(),
        dataSnapshot: {
          name: candidateName,
          title: parsedTitle,
          email: identityData.email || "",
          phone: identityData.phone || "",
          ...identityData
        }
      });

      // 6. Create document in candidate_availability
      await db.collection("candidate_availability").add({
        candidateId: poolRef.id,
        status: "Available",
        noticePeriod: identityData.notice_period || "Immediate",
        lastCheckedAt: new Date().toISOString()
      });

      // 7. Create document in candidate_activity
      await db.collection("candidate_activity").add({
        candidateId: poolRef.id,
        activityType: "INGESTION",
        performedBy: vendorId,
        description: `Candidate registered into passive Talent Pool as Available.`,
        timestamp: new Date().toISOString()
      });

      // 8. LAW 1: Immutable Company Ledger system_events
      await db.collection("system_events").add({
        type: "CANDIDATE_POOL_INGESTED",
        message: `Vendor ingested candidate ${candidateName} into the global Talent Pool as Available.`,
        timestamp: new Date().toISOString(),
        entityType: "vendor_candidate",
        entityId: poolRef.id,
        role: "vendor",
        data: {
          candidateName,
          vendorId,
          standardizedTitle: parsedTitle,
          skills: parsedSkills,
          fraudDetected
        }
      });

      return res.status(200).json({
        success: true,
        candidateId: poolRef.id,
        standardizedTitle: parsedTitle,
        skills: parsedSkills,
        summary: parsedSummary,
        fraudDetected
      });

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  } else if (action === "triggerAiRotation") {
    try {
      if (!db) throw new Error("Database not initialized");

      const { vendorId } = req.body;
      if (!vendorId) {
        return res.status(400).json({ error: "Missing vendorId" });
      }

      // Fetch all "Available" candidates in vendor_candidate_pool for this vendor
      const poolQuery = await db.collection("vendor_candidate_pool")
        .where("vendorId", "==", vendorId)
        .where("stage", "==", "Available")
        .get();

      if (poolQuery.empty) {
        return res.status(200).json({ success: true, matches: [], message: "No active available candidates in your pool to rotate." });
      }

      // Fetch active requirements
      const reqQuery = await db.collection("requirements_private").get();
      const requirements: any[] = [];
      reqQuery.forEach(doc => {
        requirements.push({ id: doc.id, ...doc.data() });
      });

      const pubQuery = await db.collection("requirements_public").get();
      pubQuery.forEach(doc => {
        requirements.push({ id: doc.id, ...doc.data() });
      });

      if (requirements.length === 0) {
        return res.status(200).json({ success: true, matches: [], message: "No active job requirements found for matching." });
      }

      const matches: any[] = [];

      // Run rotation matcher for each candidate
      for (const candDoc of poolQuery.docs) {
        const candidate = { id: candDoc.id, ...candDoc.data() as any };

        for (const reqItem of requirements) {
          const candSkills = candidate.skills || [];
          const reqSkills = reqItem.skills || [];
          const overlap = candSkills.filter((s: string) => 
            reqSkills.some((rs: string) => rs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(rs.toLowerCase()))
          );

          let score = Math.round((overlap.length / Math.max(reqSkills.length, 1)) * 100);
          if (score < 40) {
            if (reqItem.title && candidate.currentTitle && reqItem.title.toLowerCase().includes(candidate.currentTitle.toLowerCase())) {
              score += 45;
            }
          }

          // If a solid candidate rotation match is identified
          if (score > 60) {
            const assignmentRef = await db.collection("candidate_assignments").add({
              candidateId: candidate.id,
              requirementId: reqItem.id,
              assignedBy: "AI_ROTATION_ENGINE",
              assignedAt: new Date().toISOString(),
              status: "Proposed",
              score: Math.min(score, 100)
            });

            await db.collection("candidate_activity").add({
              candidateId: candidate.id,
              activityType: "ROTATION_MATCHED",
              performedBy: "AI_ROTATION_ENGINE",
              description: `Candidate automatically matched and proposed to Requirement: "${reqItem.title}" (Match Score: ${score}%).`,
              timestamp: new Date().toISOString()
            });

            await db.collection("system_events").add({
              type: "CANDIDATE_ROTATION_PROPOSED",
              message: `AI Rotation Engine proposed Candidate ${candidate.name} for Requirement ${reqItem.title} with match score ${score}%.`,
              timestamp: new Date().toISOString(),
              entityType: "candidate_assignment",
              entityId: assignmentRef.id,
              role: "system",
              data: {
                candidateId: candidate.id,
                requirementId: reqItem.id,
                score
              }
            });

            matches.push({
              candidateId: candidate.id,
              candidateName: candidate.name,
              requirementId: reqItem.id,
              requirementTitle: reqItem.title,
              score: Math.min(score, 100)
            });
          }
        }
      }

      // Update Vendor compliance and performance score for triggering active deployment!
      const vendorDoc = await db.collection("vendors").doc(vendorId).get();
      if (vendorDoc.exists) {
        const vData = vendorDoc.data() || {};
        const newScore = Math.min((vData.performanceScore || 85) + 3, 100);
        await db.collection("vendors").doc(vendorId).update({
          performanceScore: newScore,
          lastRotationTime: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        matches,
        message: `Successfully executed AI Candidate Rotation. Proposed ${matches.length} matches.`
      });

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  } else if (action === "validateCandidates") {
    try {
      if (!db) throw new Error("Database not initialized");

      const { candidateIds, vendorId } = req.body;
      if (!Array.isArray(candidateIds) || !vendorId) {
        return res.status(400).json({ error: "Missing candidateIds or vendorId" });
      }

      for (const id of candidateIds) {
        const availQuery = await db.collection("candidate_availability")
          .where("candidateId", "==", id)
          .get();

        if (!availQuery.empty) {
          const docId = availQuery.docs[0].id;
          await db.collection("candidate_availability").doc(docId).update({
            lastCheckedAt: new Date().toISOString()
          });
        } else {
          await db.collection("candidate_availability").add({
            candidateId: id,
            status: "Available",
            noticePeriod: "Immediate",
            lastCheckedAt: new Date().toISOString()
          });
        }

        await db.collection("candidate_activity").add({
          candidateId: id,
          activityType: "MONTHLY_VALIDATION",
          performedBy: vendorId,
          description: `Vendor manually validated candidate freshness and active availability.`,
          timestamp: new Date().toISOString()
        });

        await db.collection("vendor_candidate_pool").doc(id).update({
          updatedAt: new Date().toISOString()
        });
      }

      // Update Vendor performance score and response rate
      const vendorDoc = await db.collection("vendors").doc(vendorId).get();
      if (vendorDoc.exists) {
        const vData = vendorDoc.data() || {};
        const currentScore = vData.performanceScore || 85;
        const currentRate = vData.responseRate || 90;
        await db.collection("vendors").doc(vendorId).update({
          performanceScore: Math.min(currentScore + 4, 100),
          responseRate: Math.min(currentRate + 2, 100),
          lastValidationTime: new Date().toISOString()
        });
      }

      await db.collection("system_events").add({
        type: "VENDOR_COMPLIANCE_VALIDATED",
        message: `Vendor ${vendorId} validated freshness for ${candidateIds.length} candidate profiles in their Talent Pool.`,
        timestamp: new Date().toISOString(),
        entityType: "vendor",
        entityId: vendorId,
        role: "vendor",
        data: {
          count: candidateIds.length
        }
      });

      return res.status(200).json({
        success: true,
        message: `Successfully validated ${candidateIds.length} profiles and updated vendor compliance metrics.`
      });

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Invalid action" });
}

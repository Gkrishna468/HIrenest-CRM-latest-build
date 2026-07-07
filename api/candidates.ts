import { VercelRequest, VercelResponse } from "@vercel/node";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { executeServerAITask } from "./aiGateway.js";
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

export function fallbackExtractData(candidateName: string, identityData: any) {
  let title = identityData.current_title || identityData.currentTitle || "Software Engineer";
  let skills: string[] = identityData.skills || [];
  let summary = identityData.cover_note || "Vetted talent pool candidate registered for active rotation.";
  let fraud = false;

  const textToScan = `${candidateName} ${title} ${JSON.stringify(skills)} ${identityData.cover_note || ""} ${identityData.resume_url || ""}`.toLowerCase();

  // Basic skills extraction (safe)
  const commonSkills = [
    "React", "Node.js", "TypeScript", "JavaScript", "Python", "Java", "AWS", "Docker", "Kubernetes", "SQL",
    "PostgreSQL", "MongoDB", "Express", "Next.js", "Redux", "Tailwind", "Git", "DevOps", "CI/CD", "Angular",
    "Vue", "Spring Boot", "Django", "FastAPI", "Go", "Rust", "C++", "C#", "Azure", "GCP", "HTML", "CSS"
  ];

  if (skills.length === 0) {
    for (const skill of commonSkills) {
      if (textToScan.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    }
  }

  // Prevent empty skills
  if (skills.length === 0) {
    skills = ["Software Engineering", "Full Stack Development"];
  }

  // Safe parameters extraction
  const noticePeriod = identityData.notice_period || identityData.noticePeriod || "Immediate";
  const location = identityData.location || "Bengaluru";
  const experience = identityData.experience || "Not Specified";

  // Obvious test emails or dummy numbers can be flagged as fraud, but avoid high-confidence fraud claims
  const email = (identityData.email || "").toLowerCase();
  const phone = (identityData.phone || "");
  if (email.includes("test@") || email.includes("example.com") || phone.includes("1234567890")) {
    fraud = true;
  }

  return { title, skills, summary, fraud, noticePeriod, location, experience };
}

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
        }
        // If same vendor, we DO NOT throw 409. We let it proceed to allow multi-requirement submission or updates.
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

      // 3. Perform AI Resume Screening using the AI Gateway
      let aiMatchScore = 75;
      let aiSummary = "Vetted profile awaiting BDM review.";
      let fraudDetected = false;
      let skillsList = identityData.skills || [];
      let aiPassed = false;

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

        const gatewayResult = await executeServerAITask({
          action: "candidate-evaluation",
          prompt: evaluationPrompt,
          responseFormatJson: true,
          complexity: "simple"
        });

        const cleanText = (gatewayResult.text || "")
          .replace(/\`\`\`json|\`\`\`/g, "")
          .trim();
        const evaluation = JSON.parse(cleanText);

        if (evaluation.matchScore !== undefined) aiMatchScore = Number(evaluation.matchScore);
        if (evaluation.summary) aiSummary = evaluation.summary;
        if (evaluation.fraudDetected !== undefined) fraudDetected = !!evaluation.fraudDetected;
        if (Array.isArray(evaluation.skills)) skillsList = evaluation.skills;
        aiPassed = true;

      } catch (err) {
        console.error("AI Gateway screening failed, using fallbacks:", err);
        const fb = fallbackExtractData(candidateName, identityData);
        if (skillsList.length === 0) skillsList = fb.skills;
        aiSummary = `Vetted talent profile: ${fb.summary}`;
        fraudDetected = fb.fraud;
        let matchCount = 0;
        const lowerJobSkills = jobSkills.map(s => s.toLowerCase());
        for (const s of skillsList) {
          if (lowerJobSkills.includes(s.toLowerCase())) matchCount++;
        }
        if (jobSkills.length > 0) {
          aiMatchScore = Math.min(100, Math.max(50, Math.round((matchCount / jobSkills.length) * 100)));
        } else {
          aiMatchScore = 75;
        }
      }

      // Validate done - create ownership if not already claimed
      let vaultDocRefId = null;
      if (existingQuery.empty) {
        const payload = {
          candidateHash,
          vendorId,
          candidateName,
          createdAt: new Date().toISOString(),
          source: "vendor",
          identityData,
        };
        await ownershipRef.add(payload);
        
        // Identity Vault Doc for global lock
        const vaultDocRef = db.collection("candidate_identity_vault").doc();
        vaultDocRefId = vaultDocRef.id;
        await vaultDocRef.set({
          candidateHash,
          vendorId,
          candidateName,
          ownershipLocked: true,
          createdAt: new Date().toISOString()
        });
      }
      
      // Create Firebase Candidates Pool
      const candRef = db.collection("candidates").doc();
      await candRef.set({
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
        candidateHash,
        ...identityData
      });

      if (vaultDocRefId) {
         await db.collection("candidate_identity_vault").doc(vaultDocRefId).update({
           candidateId: candRef.id,
         });
      }

      // Vendor Candidate Pool entry
      await db.collection("vendor_candidate_pool").add({
        name: candidateName,
        vendorId,
        stage: "submission",
        currentTitle: identityData.current_title || "Candidate",
        skills: skillsList,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: aiSummary,
        fraudDetected,
        candidateId: candRef.id,
        candidateHash,
        lastSyncedAt: new Date().toISOString(),
        syncSource: "vendor_submit",
        syncVersion: 1,
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

      // Calculate SHA256 of the profile/resume content
      const resumeHash = crypto
        .createHash("sha256")
        .update(identityData.resume_url || identityData.resumeText || JSON.stringify(identityData))
        .digest("hex");

      // 1. Check candidate_identity_vault for global double-submission lock (duplicate check)
      const vaultRef = db.collection("candidate_identity_vault");
      const existingQuery = await vaultRef.where("candidateHash", "==", candidateHash).get();

      // Resolve or compute extraction data
      let parsedTitle = identityData.current_title || identityData.currentTitle || "Software Engineer";
      let parsedSkills = identityData.skills || [];
      let parsedSummary = identityData.cover_note || "Vetted talent pool candidate registered for active rotation.";
      let fraudDetected = false;
      let aiStatus = "pending";
      let parsingQuality = null;

      // Execute AI Gateway
      let aiPassed = false;
      try {
        const extractionPrompt = `
          Act as the Staffing Intelligence Analyzer for HireNestOS.
          Extract key parameters from this candidate profile.

          CANDIDATE:
          Name: ${candidateName}
          Title: ${parsedTitle}
          Skills: ${JSON.stringify(parsedSkills)}
          Notes: ${identityData.cover_note || ""}

          TASK:
          1. Suggest the best standardized Technical Job Title.
          2. Extract skills list as a JSON array of strings.
          3. Formulate a 2-3 sentence professional summary / profile highlights.
          4. Detect potential fraud markers (return true or false).
          5. Score the parsing quality based on completeness (score 0-100).

          RETURN ONLY VALID JSON:
          {
            "standardizedTitle": "e.g. Senior React Developer",
            "skills": ["skill1", "skill2"],
            "summary": "Summary text",
            "fraudDetected": false,
            "parsingQuality": {
              "score": 98,
              "skillsFound": true,
              "experienceFound": true,
              "emailFound": true,
              "phoneFound": true,
              "linkedinFound": false
            }
          }
        `;

        const gatewayResult = await executeServerAITask({
          action: "candidate-extraction",
          prompt: extractionPrompt,
          responseFormatJson: true,
          complexity: "simple"
        });

        const cleanText = (gatewayResult.text || "")
          .replace(/\`\`\`json|\`\`\`/g, "")
          .trim();
        const parsed = JSON.parse(cleanText);

        if (parsed.standardizedTitle) parsedTitle = parsed.standardizedTitle;
        if (Array.isArray(parsed.skills)) parsedSkills = parsed.skills;
        if (parsed.summary) parsedSummary = parsed.summary;
        if (parsed.fraudDetected !== undefined) fraudDetected = !!parsed.fraudDetected;
        if (parsed.parsingQuality) parsingQuality = parsed.parsingQuality;
        
        aiPassed = true;
        aiStatus = "parsed";
      } catch (err) {
        console.error("AI Gateway pool extraction failed, falling back to smart regex/rule-based extractor:", err);
        aiStatus = "pending";
      }

      if (!aiPassed) {
        // Run smart fallback parser
        const fb = fallbackExtractData(candidateName, identityData);
        parsedTitle = fb.title;
        parsedSkills = fb.skills;
        parsedSummary = fb.summary;
        fraudDetected = fb.fraud;
      }

      // Initialize atomic batch write
      const batch = db.batch();
      const telRef = db.collection("ingestion_telemetry").doc("overall");

      // Handle duplicate check
      if (!existingQuery.empty) {
        const existingDoc = existingQuery.docs[0];
        const existing = existingDoc.data();
        if (existing.vendorId !== vendorId) {
          // Increment Conflict Counter in Telemetry
          batch.set(telRef, {
            conflicts: FieldValue.increment(1)
          }, { merge: true });
          await batch.commit();

          return res.status(409).json({ 
            error: "Candidate Ownership Conflict", 
            message: `This profile is already locked under prior registry claims by another vendor.` 
          });
        } else {
          // SAME VENDOR: Update existing gracefully
          console.log(`[INGESTION] Existing talent pool candidate registered by same vendor ${vendorId}. Performing batched transaction update.`);

          let candidateId = existing.candidateId;
          if (!candidateId) {
            const candSnap = await db.collection("candidates")
              .where("candidateHash", "==", candidateHash)
              .limit(1)
              .get();
            if (!candSnap.empty) {
              candidateId = candSnap.docs[0].id;
            }
          }

          if (!candidateId) {
            const newCandRef = db.collection("candidates").doc();
            candidateId = newCandRef.id;

            batch.set(newCandRef, {
              name: candidateName,
              vendorId: vendorId,
              vendor_company_id: vendorId,
              stage: "Available",
              source: "vendor_pool",
              created_at: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              assignedBdm: "Ravi",
              aiMatchScore: 85,
              fraudDetected,
              notes: parsedSummary,
              skills: parsedSkills,
              organizationId: vendorId,
              ownerType: "Vendor",
              ownerUserId: vendorId,
              submittedVia: "Vendor Pool",
              ownershipLocked: true,
              candidateHash,
              aiStatus,
              parsingQuality,
              lastSyncedAt: new Date().toISOString(),
              syncSource: "vendor_pool",
              syncVersion: 1,
              ...identityData
            });
          } else {
            batch.update(db.collection("candidates").doc(candidateId), {
              name: candidateName,
              skills: parsedSkills,
              currentTitle: parsedTitle,
              expectedSalary: identityData.expected_salary || identityData.expectedSalary || "",
              location: identityData.location || "Bengaluru",
              notes: parsedSummary,
              fraudDetected,
              updatedAt: new Date().toISOString(),
              aiStatus,
              parsingQuality,
              lastSyncedAt: new Date().toISOString(),
              syncSource: "vendor_pool",
              syncVersion: FieldValue.increment(1),
              ...identityData
            });
          }

          // Update candidate_identity_vault with link
          batch.update(vaultRef.doc(existingDoc.id), {
            candidateId,
            updatedAt: new Date().toISOString()
          });

          // Create or update vendor_candidate_pool entry
          const poolSnap = await db.collection("vendor_candidate_pool")
            .where("vendorId", "==", vendorId)
            .where("candidateHash", "==", candidateHash)
            .limit(1)
            .get();

          const poolData = {
            name: candidateName,
            vendorId,
            stage: "Available",
            currentTitle: parsedTitle,
            skills: parsedSkills,
            updatedAt: new Date().toISOString(),
            notes: parsedSummary,
            fraudDetected,
            candidateId,
            candidateHash,
            aiStatus,
            parsingQuality,
            lastSyncedAt: new Date().toISOString(),
            syncSource: "vendor_pool",
            syncVersion: FieldValue.increment(1),
            ...identityData
          };

          if (!poolSnap.empty) {
            batch.update(db.collection("vendor_candidate_pool").doc(poolSnap.docs[0].id), poolData);
          } else {
            const newPoolRef = db.collection("vendor_candidate_pool").doc();
            batch.set(newPoolRef, {
              ...poolData,
              createdAt: new Date().toISOString()
            });
          }

          // Version check using Resume Content Hashing
          const versionSnap = await db.collection("candidate_versions")
            .where("candidateId", "==", candidateId)
            .where("resumeHash", "==", resumeHash)
            .limit(1)
            .get();

          let versionCreated = false;
          if (versionSnap.empty) {
            const versionRef = db.collection("candidate_versions").doc();
            batch.set(versionRef, {
              candidateId,
              resumeHash,
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
            versionCreated = true;
          }

          // Update candidate_availability
          const availSnap = await db.collection("candidate_availability")
            .where("candidateId", "==", candidateId)
            .limit(1)
            .get();

          if (!availSnap.empty) {
            batch.update(db.collection("candidate_availability").doc(availSnap.docs[0].id), {
              status: "Available",
              noticePeriod: identityData.notice_period || "Immediate",
              lastCheckedAt: new Date().toISOString()
            });
          } else {
            const newAvailRef = db.collection("candidate_availability").doc();
            batch.set(newAvailRef, {
              candidateId,
              status: "Available",
              noticePeriod: identityData.notice_period || "Immediate",
              lastCheckedAt: new Date().toISOString()
            });
          }

          // Activity logging
          const actRef = db.collection("candidate_activity").doc();
          batch.set(actRef, {
            candidateId,
            activityType: "INGESTION_UPDATE",
            performedBy: vendorId,
            description: `Candidate profile updated in passive Talent Pool as Available.${!versionCreated ? ' (Availability & metadata synced, resume unchanged)' : ' (New resume version registered)'}`,
            timestamp: new Date().toISOString()
          });

          // Immutable Company Ledger
          const sysEventRef = db.collection("system_events").doc();
          batch.set(sysEventRef, {
            type: "CANDIDATE_POOL_UPDATED",
            message: `Vendor updated candidate ${candidateName} in the global Talent Pool as Available.`,
            timestamp: new Date().toISOString(),
            entityType: "vendor_candidate",
            entityId: candidateId,
            role: "vendor",
            data: {
              candidateName,
              vendorId,
              standardizedTitle: parsedTitle,
              skills: parsedSkills,
              fraudDetected
            }
          });

          // Queue for reprocessing if Gemini failed/429
          if (aiStatus === "pending") {
            const queueRef = db.collection("ai_reprocessing_queue").doc();
            batch.set(queueRef, {
              candidateId,
              candidateName,
              vendorId,
              candidateHash,
              status: "pending",
              createdAt: new Date().toISOString(),
              attempts: 0,
              identityData
            });
          }

          // Update Telemetry
          batch.set(telRef, {
            successfulUploads: FieldValue.increment(1),
            updates: FieldValue.increment(1),
            duplicates: FieldValue.increment(versionCreated ? 0 : 1),
            fallbackUsage: FieldValue.increment(aiStatus === "pending" ? 1 : 0),
            retryQueueSize: FieldValue.increment(aiStatus === "pending" ? 1 : 0)
          }, { merge: true });

          await batch.commit();

          return res.status(200).json({
            success: true,
            candidateId,
            standardizedTitle: parsedTitle,
            skills: parsedSkills,
            summary: parsedSummary,
            fraudDetected,
            updated: true,
            aiStatus
          });
        }
      }

      // BRAND NEW CANDIDATE INGESTION
      const candRef = db.collection("candidates").doc();
      const candidateId = candRef.id;

      batch.set(candRef, {
        name: candidateName,
        vendorId: vendorId,
        vendor_company_id: vendorId,
        stage: "Available",
        source: "vendor_pool",
        created_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedBdm: "Ravi",
        aiMatchScore: 85,
        fraudDetected,
        notes: parsedSummary,
        skills: parsedSkills,
        organizationId: vendorId,
        ownerType: "Vendor",
        ownerUserId: vendorId,
        submittedVia: "Vendor Pool",
        ownershipLocked: true,
        candidateHash,
        aiStatus,
        parsingQuality,
        lastSyncedAt: new Date().toISOString(),
        syncSource: "vendor_pool",
        syncVersion: 1,
        ...identityData
      });

      // Identity Vault Doc
      const vaultDocRef = db.collection("candidate_identity_vault").doc();
      batch.set(vaultDocRef, {
        candidateHash,
        vendorId,
        candidateName,
        candidateId,
        ownershipLocked: true,
        createdAt: new Date().toISOString()
      });

      // Vendor Candidate Pool entry
      const poolDocRef = db.collection("vendor_candidate_pool").doc();
      batch.set(poolDocRef, {
        name: candidateName,
        vendorId,
        stage: "Available",
        currentTitle: parsedTitle,
        skills: parsedSkills,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: parsedSummary,
        fraudDetected,
        candidateId,
        candidateHash,
        aiStatus,
        parsingQuality,
        lastSyncedAt: new Date().toISOString(),
        syncSource: "vendor_pool",
        syncVersion: 1,
        ...identityData
      });

      // Candidate versions
      const versionRef = db.collection("candidate_versions").doc();
      batch.set(versionRef, {
        candidateId,
        resumeHash,
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

      // Candidate availability
      const availRef = db.collection("candidate_availability").doc();
      batch.set(availRef, {
        candidateId,
        status: "Available",
        noticePeriod: identityData.notice_period || "Immediate",
        lastCheckedAt: new Date().toISOString()
      });

      // Candidate activity
      const actRef = db.collection("candidate_activity").doc();
      batch.set(actRef, {
        candidateId,
        activityType: "INGESTION",
        performedBy: vendorId,
        description: `Candidate registered into passive Talent Pool as Available.`,
        timestamp: new Date().toISOString()
      });

      // Immutable Event Ledger
      const sysEventRef = db.collection("system_events").doc();
      batch.set(sysEventRef, {
        type: "CANDIDATE_POOL_INGESTED",
        message: `Vendor ingested candidate ${candidateName} into the global Talent Pool as Available.`,
        timestamp: new Date().toISOString(),
        entityType: "vendor_candidate",
        entityId: candidateId,
        role: "vendor",
        data: {
          candidateName,
          vendorId,
          standardizedTitle: parsedTitle,
          skills: parsedSkills,
          fraudDetected
        }
      });

      // Queue for reprocessing if Gemini failed/429
      if (aiStatus === "pending") {
        const queueRef = db.collection("ai_reprocessing_queue").doc();
        batch.set(queueRef, {
          candidateId,
          candidateName,
          vendorId,
          candidateHash,
          status: "pending",
          createdAt: new Date().toISOString(),
          attempts: 0,
          identityData
        });
      }

      // Update Telemetry
      batch.set(telRef, {
        successfulUploads: FieldValue.increment(1),
        newCandidates: FieldValue.increment(1),
        fallbackUsage: FieldValue.increment(aiStatus === "pending" ? 1 : 0),
        retryQueueSize: FieldValue.increment(aiStatus === "pending" ? 1 : 0)
      }, { merge: true });

      await batch.commit();

      return res.status(200).json({
        success: true,
        candidateId,
        standardizedTitle: parsedTitle,
        skills: parsedSkills,
        summary: parsedSummary,
        fraudDetected,
        aiStatus
      });

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  } else if (action === "reprocessAiQueue") {
    try {
      if (!db) throw new Error("Database not initialized");

      // Fetch pending items from queue
      const queueQuery = await db.collection("ai_reprocessing_queue")
        .where("status", "==", "pending")
        .limit(10) // Process in batches of 10 to keep API limits safe
        .get();

      if (queueQuery.empty) {
        return res.status(200).json({ success: true, processedCount: 0, message: "No pending items in the AI reprocessing queue." });
      }

      let processedCount = 0;
      let successCount = 0;
      let failCount = 0;

      for (const queueDoc of queueQuery.docs) {
        const queueData = queueDoc.data();
        const { candidateId, candidateName, vendorId, candidateHash, identityData, attempts } = queueData;

        processedCount++;

        // Execute Gemini
        let parsedTitle = identityData.current_title || identityData.currentTitle || "Software Engineer";
        let parsedSkills = identityData.skills || [];
        let parsedSummary = identityData.cover_note || "Talent Pool asset available for redeployment.";
        let fraudDetected = false;
        let aiPassed = false;

        try {
          const extractionPrompt = `
            Act as the Staffing Intelligence Analyzer for HireNestOS.
            Extract key parameters from this candidate profile.

            CANDIDATE:
            Name: ${candidateName}
            Title: ${parsedTitle}
            Skills: ${JSON.stringify(parsedSkills)}
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

          const gatewayResult = await executeServerAITask({
            action: "candidate-reprocessing",
            prompt: extractionPrompt,
            responseFormatJson: true,
            complexity: "simple"
          });

          const cleanText = (gatewayResult.text || "")
            .replace(/\`\`\`json|\`\`\`/g, "")
            .trim();
          const parsed = JSON.parse(cleanText);

          if (parsed.standardizedTitle) parsedTitle = parsed.standardizedTitle;
          if (Array.isArray(parsed.skills)) parsedSkills = parsed.skills;
          if (parsed.summary) parsedSummary = parsed.summary;
          if (parsed.fraudDetected !== undefined) fraudDetected = !!parsed.fraudDetected;
          aiPassed = true;
        } catch (err) {
          console.error(`AI Gateway reprocessing failed for candidate ${candidateId}:`, err);
        }

        const batch = db.batch();
        const queueDocRef = db.collection("ai_reprocessing_queue").doc(queueDoc.id);
        const candRef = db.collection("candidates").doc(candidateId);
        
        const poolQuery = await db.collection("vendor_candidate_pool")
          .where("candidateId", "==", candidateId)
          .limit(1)
          .get();

        const telRef = db.collection("ingestion_telemetry").doc("overall");

        if (aiPassed) {
          successCount++;
          // Update candidate as parsed
          batch.update(candRef, {
            currentTitle: parsedTitle,
            skills: parsedSkills,
            notes: parsedSummary,
            fraudDetected,
            aiStatus: "parsed",
            updatedAt: new Date().toISOString()
          });

          // Update vendor pool
          if (!poolQuery.empty) {
            batch.update(db.collection("vendor_candidate_pool").doc(poolQuery.docs[0].id), {
              currentTitle: parsedTitle,
              skills: parsedSkills,
              notes: parsedSummary,
              fraudDetected,
              aiStatus: "parsed",
              updatedAt: new Date().toISOString()
            });
          }

          // Mark queue item as completed
          batch.update(queueDocRef, {
            status: "completed",
            updatedAt: new Date().toISOString()
          });

          // Update Telemetry
          batch.set(telRef, {
            retryQueueSize: FieldValue.increment(-1),
            reprocessSuccessCount: FieldValue.increment(1)
          }, { merge: true });

          // Ledger event
          const sysEventRef = db.collection("system_events").doc();
          batch.set(sysEventRef, {
            type: "CANDIDATE_REPROCESSED_SUCCESS",
            message: `AI Reprocessing successfully enriched Candidate ${candidateName} (ID: ${candidateId}).`,
            timestamp: new Date().toISOString(),
            entityType: "candidate",
            entityId: candidateId,
            role: "system",
            data: { candidateName, vendorId, standardizedTitle: parsedTitle }
          });

        } else {
          failCount++;
          const nextAttempts = (attempts || 0) + 1;
          if (nextAttempts >= 3) {
            // Permanently fail this queue doc
            batch.update(queueDocRef, {
              status: "failed",
              attempts: nextAttempts,
              updatedAt: new Date().toISOString()
            });
            batch.set(telRef, {
              retryQueueSize: FieldValue.increment(-1),
              reprocessFailCount: FieldValue.increment(1)
            }, { merge: true });

            // Mark candidate aiStatus as failed
            batch.update(candRef, { aiStatus: "failed" });
            if (!poolQuery.empty) {
              batch.update(db.collection("vendor_candidate_pool").doc(poolQuery.docs[0].id), { aiStatus: "failed" });
            }
          } else {
            // Keep pending, increment attempts
            batch.update(queueDocRef, {
              attempts: nextAttempts,
              updatedAt: new Date().toISOString()
            });
          }
        }

        await batch.commit();
      }

      return res.status(200).json({
        success: true,
        processedCount,
        successCount,
        failCount,
        message: `Processed ${processedCount} queue items. Successes: ${successCount}, Failures: ${failCount}`
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

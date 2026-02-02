import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, courses, modules, evaluations, questions, answerOptions, studentProgress, evaluationAttempts, studentAnswers, certificates, cases, caseFollowUps, caseDocuments, committeeMembers, resources, jobPositions, jobFunctions, performanceEvaluations } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// User management
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(userId: number, role: "admin" | "instructor" | "student" | "committee") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// Course management
export async function getAllCourses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(courses);
}

export async function getPublishedCourses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(courses).where(eq(courses.isPublished, true));
}

export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getModulesByCourseId(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(modules).where(eq(modules.courseId, courseId));
}

export async function getModuleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Evaluation management
export async function getEvaluationsByModuleId(moduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(evaluations).where(eq(evaluations.moduleId, moduleId));
}

export async function getEvaluationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(evaluations).where(eq(evaluations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuestionsByEvaluationId(evaluationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(questions).where(eq(questions.evaluationId, evaluationId));
}

export async function getAnswerOptionsByQuestionId(questionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(answerOptions).where(eq(answerOptions.questionId, questionId));
}

// Student progress
export async function getStudentProgressByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(studentProgress).where(eq(studentProgress.userId, userId));
}

export async function getStudentProgressByCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(studentProgress)
    .where(eq(studentProgress.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Evaluation attempts
export async function getEvaluationAttemptsByUser(userId: number, evaluationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(evaluationAttempts)
    .where(eq(evaluationAttempts.userId, userId));
}

export async function getAttemptById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(evaluationAttempts).where(eq(evaluationAttempts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getStudentAnswersByAttempt(attemptId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(studentAnswers).where(eq(studentAnswers.attemptId, attemptId));
}

// Certificates
export async function getCertificatesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(certificates).where(eq(certificates.userId, userId));
}

// Cases management
export async function getAllCases() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(cases);
}

export async function getCaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCaseFollowUpsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(caseFollowUps).where(eq(caseFollowUps.caseId, caseId));
}

export async function getCaseDocumentsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(caseDocuments).where(eq(caseDocuments.caseId, caseId));
}

// Committee members
export async function getAllCommitteeMembers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(committeeMembers).where(eq(committeeMembers.isActive, true));
}

export async function getCommitteeMemberByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(committeeMembers).where(eq(committeeMembers.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Resources
export async function getAllResources() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(resources);
}

export async function getResourceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Job positions
export async function getAllJobPositions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobPositions);
}

export async function getJobPositionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobPositions).where(eq(jobPositions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getJobFunctionsByPositionId(positionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobFunctions).where(eq(jobFunctions.positionId, positionId));
}

// Performance evaluations
export async function getPerformanceEvaluationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(performanceEvaluations).where(eq(performanceEvaluations.userId, userId));
}

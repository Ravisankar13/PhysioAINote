import { db } from "./db";
import { 
  researchGaps,
  researchProjects,
  researchCollaborators,
  virtualPatientResearchConsent,
  researchDataRequests,
  virtualPatients,
  users,
  type ResearchGap,
  type ResearchProject,
  type ResearchCollaborator,
  type VirtualPatientResearchConsent,
  type ResearchDataRequest,
  type InsertResearchGap,
  type InsertResearchProject,
  type InsertResearchCollaborator,
  type InsertVirtualPatientResearchConsent,
  type InsertResearchDataRequest
} from "@shared/schema";
import { eq, desc, and, inArray, sql, count } from "drizzle-orm";

export class ResearchStorage {
  // Research Gaps Management
  async createResearchGap(data: InsertResearchGap): Promise<ResearchGap> {
    const [gap] = await db
      .insert(researchGaps)
      .values(data)
      .returning();
    return gap;
  }

  async getResearchGaps(filters?: {
    bodyPart?: string;
    priority?: string;
    gapType?: string;
    limit?: number;
  }): Promise<ResearchGap[]> {
    const conditions = [];
    
    if (filters?.bodyPart && filters.bodyPart !== "all") {
      conditions.push(eq(researchGaps.bodyPart, filters.bodyPart as any));
    }
    
    if (filters?.priority) {
      conditions.push(eq(researchGaps.priority, filters.priority));
    }
    
    if (filters?.gapType) {
      conditions.push(eq(researchGaps.gapType, filters.gapType));
    }

    let query = db.select().from(researchGaps);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(researchGaps.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  async getResearchGap(id: number): Promise<ResearchGap | undefined> {
    const [gap] = await db
      .select()
      .from(researchGaps)
      .where(eq(researchGaps.id, id));
    return gap;
  }

  async updateResearchGap(id: number, data: Partial<InsertResearchGap>): Promise<ResearchGap> {
    const [gap] = await db
      .update(researchGaps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(researchGaps.id, id))
      .returning();
    return gap;
  }

  async deleteResearchGap(id: number): Promise<void> {
    await db
      .delete(researchGaps)
      .where(eq(researchGaps.id, id));
  }

  // Research Projects Management
  async createResearchProject(data: InsertResearchProject): Promise<ResearchProject> {
    const [project] = await db
      .insert(researchProjects)
      .values(data)
      .returning();
    return project;
  }

  async getResearchProjects(filters?: {
    userId?: number;
    status?: string;
    isPublic?: boolean;
    limit?: number;
  }): Promise<ResearchProject[]> {
    let query = db.select().from(researchProjects);
    
    if (filters?.userId) {
      query = query.where(eq(researchProjects.principalInvestigatorId, filters.userId));
    }
    
    if (filters?.status) {
      query = query.where(eq(researchProjects.status, filters.status));
    }
    
    if (filters?.isPublic !== undefined) {
      query = query.where(eq(researchProjects.isPublic, filters.isPublic));
    }

    query = query.orderBy(desc(researchProjects.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  async getResearchProject(id: number, userId?: number): Promise<ResearchProject | undefined> {
    let query = db.select().from(researchProjects).where(eq(researchProjects.id, id));
    
    // If userId provided, check if user has access (either as PI or collaborator)
    if (userId) {
      query = query.where(
        and(
          eq(researchProjects.id, id),
          sql`(${researchProjects.principalInvestigatorId} = ${userId} OR ${researchProjects.isPublic} = true OR EXISTS (
            SELECT 1 FROM ${researchCollaborators} 
            WHERE ${researchCollaborators.projectId} = ${researchProjects.id} 
            AND ${researchCollaborators.userId} = ${userId}
          ))`
        )
      );
    }

    const [project] = await query;
    return project;
  }

  async updateResearchProject(id: number, data: Partial<InsertResearchProject>): Promise<ResearchProject> {
    const [project] = await db
      .update(researchProjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(researchProjects.id, id))
      .returning();
    return project;
  }

  async deleteResearchProject(id: number): Promise<void> {
    await db
      .delete(researchProjects)
      .where(eq(researchProjects.id, id));
  }

  // Research Collaborators Management
  async addCollaborator(data: InsertResearchCollaborator): Promise<ResearchCollaborator> {
    const [collaborator] = await db
      .insert(researchCollaborators)
      .values(data)
      .returning();
    return collaborator;
  }

  async getProjectCollaborators(projectId: number): Promise<(ResearchCollaborator & { user: { username: string; email: string } })[]> {
    return await db
      .select({
        id: researchCollaborators.id,
        projectId: researchCollaborators.projectId,
        userId: researchCollaborators.userId,
        role: researchCollaborators.role,
        permissions: researchCollaborators.permissions,
        addedAt: researchCollaborators.addedAt,
        user: {
          username: users.username,
          email: users.email
        }
      })
      .from(researchCollaborators)
      .innerJoin(users, eq(researchCollaborators.userId, users.id))
      .where(eq(researchCollaborators.projectId, projectId));
  }

  async removeCollaborator(projectId: number, userId: number): Promise<void> {
    await db
      .delete(researchCollaborators)
      .where(
        and(
          eq(researchCollaborators.projectId, projectId),
          eq(researchCollaborators.userId, userId)
        )
      );
  }

  // Virtual Patient Research Consent Management
  async setVirtualPatientConsent(data: InsertVirtualPatientResearchConsent): Promise<VirtualPatientResearchConsent> {
    // Check if consent already exists
    const [existing] = await db
      .select()
      .from(virtualPatientResearchConsent)
      .where(
        and(
          eq(virtualPatientResearchConsent.virtualPatientId, data.virtualPatientId),
          eq(virtualPatientResearchConsent.userId, data.userId)
        )
      );

    if (existing) {
      // Update existing consent
      const [updated] = await db
        .update(virtualPatientResearchConsent)
        .set(data)
        .where(eq(virtualPatientResearchConsent.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new consent
      const [consent] = await db
        .insert(virtualPatientResearchConsent)
        .values(data)
        .returning();
      return consent;
    }
  }

  async getVirtualPatientConsent(virtualPatientId: number, userId: number): Promise<VirtualPatientResearchConsent | undefined> {
    const [consent] = await db
      .select()
      .from(virtualPatientResearchConsent)
      .where(
        and(
          eq(virtualPatientResearchConsent.virtualPatientId, virtualPatientId),
          eq(virtualPatientResearchConsent.userId, userId)
        )
      );
    return consent;
  }

  // Virtual Patient Research Data Access
  async getResearchEligibleVirtualPatients(criteria?: {
    bodyPart?: string;
    ageRange?: { min: number; max: number };
    gender?: string;
    excludeUserIds?: number[];
  }): Promise<any[]> {
    let query = db
      .select({
        id: virtualPatients.id,
        patientName: virtualPatients.patient_name,
        age: virtualPatients.age,
        gender: virtualPatients.gender,
        bodyPart: virtualPatients.body_part,
        chiefComplaint: virtualPatients.chief_complaint,
        symptomsDescription: virtualPatients.symptoms_description,
        pastMedicalHistory: virtualPatients.past_medical_history,
        diagnosis: virtualPatients.diagnosis,
        differentialDiagnosis: virtualPatients.differentialDiagnosis,
        treatmentOptions: virtualPatients.treatmentOptions,
        createdAt: virtualPatients.createdAt,
        // Include consent status
        consentedForResearch: virtualPatientResearchConsent.consentedForResearch
      })
      .from(virtualPatients)
      .innerJoin(
        virtualPatientResearchConsent,
        and(
          eq(virtualPatientResearchConsent.virtualPatientId, virtualPatients.id),
          eq(virtualPatientResearchConsent.consentedForResearch, true)
        )
      );

    if (criteria?.bodyPart && criteria.bodyPart !== "all") {
      query = query.where(eq(virtualPatients.body_part, criteria.bodyPart));
    }

    if (criteria?.ageRange) {
      query = query.where(
        and(
          sql`${virtualPatients.age} >= ${criteria.ageRange.min}`,
          sql`${virtualPatients.age} <= ${criteria.ageRange.max}`
        )
      );
    }

    if (criteria?.gender) {
      query = query.where(eq(virtualPatients.gender, criteria.gender));
    }

    if (criteria?.excludeUserIds && criteria.excludeUserIds.length > 0) {
      query = query.where(sql`${virtualPatients.userId} NOT IN (${criteria.excludeUserIds.join(',')})`);
    }

    return await query;
  }

  // Research Data Requests Management
  async createDataRequest(data: InsertResearchDataRequest): Promise<ResearchDataRequest> {
    const [request] = await db
      .insert(researchDataRequests)
      .values(data)
      .returning();
    return request;
  }

  async getDataRequests(filters?: {
    projectId?: number;
    requestedById?: number;
    approvalStatus?: string;
  }): Promise<ResearchDataRequest[]> {
    let query = db.select().from(researchDataRequests);
    
    if (filters?.projectId) {
      query = query.where(eq(researchDataRequests.projectId, filters.projectId));
    }
    
    if (filters?.requestedById) {
      query = query.where(eq(researchDataRequests.requestedById, filters.requestedById));
    }
    
    if (filters?.approvalStatus) {
      query = query.where(eq(researchDataRequests.approvalStatus, filters.approvalStatus));
    }

    return await query.orderBy(desc(researchDataRequests.createdAt));
  }

  async updateDataRequestStatus(
    id: number, 
    status: string, 
    approvedById?: number
  ): Promise<ResearchDataRequest> {
    const updateData: any = { 
      approvalStatus: status 
    };
    
    if (approvedById) {
      updateData.approvedById = approvedById;
      updateData.approvalDate = new Date();
    }

    const [request] = await db
      .update(researchDataRequests)
      .set(updateData)
      .where(eq(researchDataRequests.id, id))
      .returning();
    return request;
  }

  // Research Statistics
  async getResearchStatistics(): Promise<{
    totalGaps: number;
    totalProjects: number;
    totalConsentedPatients: number;
    gapsByPriority: Record<string, number>;
    projectsByStatus: Record<string, number>;
  }> {
    const [gapsCount] = await db
      .select({ count: count() })
      .from(researchGaps);

    const [projectsCount] = await db
      .select({ count: count() })
      .from(researchProjects);

    const [consentedPatientsCount] = await db
      .select({ count: count() })
      .from(virtualPatientResearchConsent)
      .where(eq(virtualPatientResearchConsent.consentedForResearch, true));

    // Get gaps by priority
    const gapsByPriority = await db
      .select({
        priority: researchGaps.priority,
        count: count()
      })
      .from(researchGaps)
      .groupBy(researchGaps.priority);

    // Get projects by status
    const projectsByStatus = await db
      .select({
        status: researchProjects.status,
        count: count()
      })
      .from(researchProjects)
      .groupBy(researchProjects.status);

    return {
      totalGaps: gapsCount.count,
      totalProjects: projectsCount.count,
      totalConsentedPatients: consentedPatientsCount.count,
      gapsByPriority: gapsByPriority.reduce((acc, item) => {
        acc[item.priority] = item.count;
        return acc;
      }, {} as Record<string, number>),
      projectsByStatus: projectsByStatus.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

export const researchStorage = new ResearchStorage();
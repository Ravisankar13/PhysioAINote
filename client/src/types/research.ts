export interface ResearchArticle {
  id: number;
  title: string;
  authors: string;
  journal: string;
  publicationDate: string;
  doi: string;
  abstract: string;
  url: string;
  bodyPart: string;
  keyFindings?: string;
  clinicalRelevance?: string;
  createdAt: string;
  updatedAt: string;
}
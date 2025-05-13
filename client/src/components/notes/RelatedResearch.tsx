import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Loader2, BookOpen } from "lucide-react";

// Define the ResearchArticle type directly here for simplicity
interface ResearchArticle {
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

interface RelatedResearchProps {
  noteId: number;
}

export function RelatedResearch({ noteId }: RelatedResearchProps) {
  const { data: articles, isLoading, error } = useQuery<ResearchArticle[]>({
    queryKey: [`/api/notes/${noteId}/related-research`],
    enabled: noteId > 0, // Only run the query if noteId is valid
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 text-primary animate-spin mr-2" />
        <span>Finding relevant research...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        Error loading research articles. Please try again later.
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        No relevant research articles found for this clinical note.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center">
        <BookOpen className="h-4 w-4 mr-1" />
        Related Research Articles
      </h3>
      <div className="space-y-3">
        {articles.map((article) => (
          <div key={article.id} className="border rounded-md p-3 text-sm">
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-medium">{article.title}</h4>
              <Badge variant="outline" className="whitespace-nowrap text-xs">
                {article.bodyPart}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {article.authors} • {article.journal} • {new Date(article.publicationDate).toLocaleDateString()}
            </p>
            <p className="text-xs mt-2">{article.abstract.substring(0, 150)}...</p>
            <div className="mt-2 flex justify-end">
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Read Full Article
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
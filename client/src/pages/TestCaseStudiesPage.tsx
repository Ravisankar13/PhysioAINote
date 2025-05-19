import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";

interface CaseStudy {
  id: number;
  title: string;
  bodyPart: string;
  complexity: string;
  patientDescription: string;
  correctDiagnosis: string;
  createdAt: string;
}

export default function TestCaseStudiesPage() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCaseStudies() {
      try {
        setLoading(true);
        console.log("Fetching case studies...");
        const response = await fetch('/api/case-studies?page=1&pageSize=10');
        if (!response.ok) {
          throw new Error(`Failed to fetch case studies: ${response.status}`);
        }
        const data = await response.json();
        console.log("Case studies data:", data);
        setCaseStudies(data.caseStudies || []);
      } catch (err: any) {
        console.error("Error fetching case studies:", err);
        setError(err.message || "Failed to load case studies");
      } finally {
        setLoading(false);
      }
    }

    fetchCaseStudies();
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-2">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Test Case Studies Page</h1>
          </div>
        </div>
        <p className="mt-2 text-muted-foreground">
          This is a simple test page to check if we can fetch and display case studies.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Case Studies Data Test</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading case studies...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : caseStudies.length === 0 ? (
            <div className="text-center py-10">
              <p>No case studies found. This may be because the database doesn't have any case studies yet.</p>
              <p className="mt-4">Try creating a new case study or adding sample data to the database.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-100 dark:bg-green-900 p-4 rounded-md mb-6">
                <p className="font-medium">Success! We found {caseStudies.length} case studies.</p>
              </div>
              
              <h3 className="font-semibold text-lg mb-2">Case Studies:</h3>
              {caseStudies.map((study) => (
                <div key={study.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium">{study.title}</h3>
                    <div className="flex space-x-2">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                        {study.bodyPart}
                      </span>
                      <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs">
                        {study.complexity}
                      </span>
                    </div>
                  </div>
                  
                  <p className="mt-2 text-sm text-muted-foreground">
                    {study.patientDescription}
                  </p>
                  
                  <div className="flex items-center mt-3 text-sm text-muted-foreground">
                    <span className="mr-4">Diagnosis: {study.correctDiagnosis}</span>
                    <span>Created: {new Date(study.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
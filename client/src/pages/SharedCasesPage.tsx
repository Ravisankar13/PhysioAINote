import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ThumbsUp,
  Eye,
  MessageSquare,
  Tag,
  Bookmark,
  Filter,
  Search,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Link, useNavigate } from "react-router-dom";

// Types
interface SharedCase {
  id: number;
  userId: number;
  title: string;
  description: string;
  bodyPart: string;
  patientAgeRange: string;
  patientGender: string;
  condition: string;
  presentingComplaints: string;
  expertiseLevel: string;
  complexityLevel: string;
  views: number;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}

interface SharedCasesResponse {
  cases: SharedCase[];
  total: number;
}

const BODY_PARTS = [
  { value: "shoulder", label: "Shoulder" },
  { value: "neck", label: "Neck" },
  { value: "back", label: "Back" },
  { value: "elbow", label: "Elbow" },
  { value: "wrist", label: "Wrist" },
  { value: "hand", label: "Hand" },
  { value: "hip", label: "Hip" },
  { value: "knee", label: "Knee" },
  { value: "ankle", label: "Ankle" },
  { value: "foot", label: "Foot" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

const EXPERTISE_LEVELS = [
  { value: "student", label: "Student" },
  { value: "novice", label: "Novice" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

const COMPLEXITY_LEVELS = [
  { value: "simple", label: "Simple" },
  { value: "moderate", label: "Moderate" },
  { value: "complex", label: "Complex" },
  { value: "multifactorial", label: "Multifactorial" },
];

export default function SharedCasesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter states
  const [bodyPart, setBodyPart] = useState<string>("");
  const [expertiseLevel, setExpertiseLevel] = useState<string>("");
  const [complexityLevel, setComplexityLevel] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [filter, setFilter] = useState<boolean>(false);
  const pageSize = 10;

  // Queries
  const {
    data: sharedCasesData,
    isLoading: isLoadingCases,
    isFetching: isFetchingCases,
  } = useQuery<SharedCasesResponse>({
    queryKey: [
      "/api/shared-cases",
      bodyPart,
      expertiseLevel,
      complexityLevel,
      searchTerm,
      page,
      pageSize,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (bodyPart) params.append("bodyPart", bodyPart);
      if (expertiseLevel) params.append("expertiseLevel", expertiseLevel);
      if (complexityLevel) params.append("complexityLevel", complexityLevel);
      if (searchTerm) params.append("search", searchTerm);
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      return fetch(`/api/shared-cases?${params.toString()}`).then((res) =>
        res.json()
      );
    },
    refetchOnWindowFocus: false,
  });

  const { data: myCasesData, isLoading: isLoadingMyCases } = useQuery<
    SharedCase[]
  >({
    queryKey: ["/api/my-shared-cases"],
    queryFn: () => {
      return fetch("/api/my-shared-cases").then((res) => res.json());
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const handleSearch = () => {
    // Reset to page 1 when search params change
    setPage(1);
    // Refetch with current filters
    queryClient.invalidateQueries({ queryKey: ["/api/shared-cases"] });
  };

  const resetFilters = () => {
    setBodyPart("");
    setExpertiseLevel("");
    setComplexityLevel("");
    setSearchTerm("");
    setPage(1);
    // Refetch without filters
    queryClient.invalidateQueries({ queryKey: ["/api/shared-cases"] });
  };

  const generatePageNumbers = () => {
    if (!sharedCasesData) return [];

    const totalPages = Math.ceil(sharedCasesData.total / pageSize);
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Show first, last, current and 1-2 pages before and after current
    let pages = [1];

    // Add pages around current
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) {
      pages.push(-1); // Ellipsis
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push(-1); // Ellipsis
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Peer Knowledge Exchange</h1>
        {user && (
          <Button onClick={() => navigate("/shared-cases/new")}>
            Share a Case
          </Button>
        )}
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Cases</TabsTrigger>
          {user && <TabsTrigger value="my">My Cases</TabsTrigger>}
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cases by title, description, condition..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setFilter(!filter)}
                className="md:w-auto w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>

              <Button onClick={handleSearch} className="md:w-auto w-full">
                Search
              </Button>

              {(bodyPart || expertiseLevel || complexityLevel) && (
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="md:w-auto w-full"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {filter && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/30">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Body Part
                  </label>
                  <Select value={bodyPart} onValueChange={setBodyPart}>
                    <SelectTrigger>
                      <SelectValue placeholder="All body parts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All body parts</SelectItem>
                      {BODY_PARTS.map((part) => (
                        <SelectItem key={part.value} value={part.value}>
                          {part.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Expertise Level
                  </label>
                  <Select
                    value={expertiseLevel}
                    onValueChange={setExpertiseLevel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All levels</SelectItem>
                      {EXPERTISE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Complexity
                  </label>
                  <Select
                    value={complexityLevel}
                    onValueChange={setComplexityLevel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All complexities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All complexities</SelectItem>
                      {COMPLEXITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {isLoadingCases || isFetchingCases ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sharedCasesData?.cases.length === 0 ? (
              <div className="text-center py-12 border rounded-md">
                <p className="text-lg text-muted-foreground">
                  No cases found matching your criteria.
                </p>
                {(bodyPart ||
                  expertiseLevel ||
                  complexityLevel ||
                  searchTerm) && (
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {sharedCasesData?.cases.map((caseItem) => (
                  <CaseCard key={caseItem.id} caseItem={caseItem} />
                ))}

                {sharedCasesData && sharedCasesData.total > pageSize && (
                  <Pagination className="mt-8">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={
                            page <= 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {generatePageNumbers().map((pageNum, i) =>
                        pageNum === -1 ? (
                          <PaginationItem key={`ellipsis-${i}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => p + 1)}
                          className={
                            page >= Math.ceil(sharedCasesData.total / pageSize)
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my">
          {!user ? (
            <div className="text-center py-12 border rounded-md">
              <p className="text-lg text-muted-foreground">
                Please log in to view your cases.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/auth")}
                className="mt-4"
              >
                Log In
              </Button>
            </div>
          ) : isLoadingMyCases ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : myCasesData?.length === 0 ? (
            <div className="text-center py-12 border rounded-md">
              <p className="text-lg text-muted-foreground">
                You haven't shared any cases yet.
              </p>
              <Button
                onClick={() => navigate("/shared-cases/new")}
                className="mt-4"
              >
                Share Your First Case
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {myCasesData?.map((caseItem) => (
                <CaseCard key={caseItem.id} caseItem={caseItem} isMine={true} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CaseCard({
  caseItem,
  isMine = false,
}: {
  caseItem: SharedCase;
  isMine?: boolean;
}) {
  // Find the display names for the enum values
  const bodyPartLabel =
    BODY_PARTS.find((part) => part.value === caseItem.bodyPart)?.label ||
    caseItem.bodyPart;
  const expertiseLabel =
    EXPERTISE_LEVELS.find((level) => level.value === caseItem.expertiseLevel)
      ?.label || caseItem.expertiseLevel;
  const complexityLabel =
    COMPLEXITY_LEVELS.find((level) => level.value === caseItem.complexityLevel)
      ?.label || caseItem.complexityLevel;

  // Format the created date
  const createdDate = new Date(caseItem.createdAt).toLocaleDateString();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-xl">
              <Link
                to={`/shared-cases/${caseItem.id}`}
                className="hover:underline"
              >
                {caseItem.title}
              </Link>
            </CardTitle>
            <CardDescription>
              {createdDate} • Body Part: {bodyPartLabel}
            </CardDescription>
          </div>
          {isMine && <Badge variant="secondary">My Case</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="line-clamp-2 text-muted-foreground">
          {caseItem.description}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline" className="bg-primary/5">
            {complexityLabel}
          </Badge>
          <Badge variant="outline" className="bg-primary/5">
            For {expertiseLabel}s
          </Badge>
          <Badge variant="outline" className="bg-primary/5">
            {caseItem.condition}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <div className="flex space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Eye className="mr-1 h-4 w-4" />
            {caseItem.views}
          </div>
          <div className="flex items-center">
            <ThumbsUp className="mr-1 h-4 w-4" />
            {caseItem.upvotes}
          </div>
          <div className="flex items-center">
            <MessageSquare className="mr-1 h-4 w-4" />
            {/* This would need to be retrieved from API in a production app */}
            0
          </div>
        </div>
        <Button variant="ghost" asChild>
          <Link to={`/shared-cases/${caseItem.id}`}>View Case</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

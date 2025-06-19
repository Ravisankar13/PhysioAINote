import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Plus, 
  Trash2, 
  Clock,
  Brain,
  Lightbulb,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  BookOpen,
  Stethoscope
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage } from "@shared/schema";
import InteractiveSkeleton from "@/components/3d/InteractiveSkeleton";
// Temporarily comment out to isolate the error
// import AssessmentTemplates, { type AssessmentTemplate } from "@/components/clinical/AssessmentTemplates";
// import AssessmentForm, { type AssessmentResults } from "@/components/clinical/AssessmentForm";
// import EvidenceBasedProtocols from "@/components/clinical/EvidenceBasedProtocols";

interface ChatMessage extends PhysioGptMessage {
  suggestions?: string[];
}

interface PhysioGptResponse {
  response: string;
  conversationId: number;
  suggestions?: string[];
}

export default function PhysioGPT() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<string | null>(null);
  const [selectedBodyRegionName, setSelectedBodyRegionName] = useState<string | null>(null);
  const [show3DPanel, setShow3DPanel] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedAssessmentTemplate, setSelectedAssessmentTemplate] = useState<any | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch user conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<PhysioGptConversation[]>({
    queryKey: ["/api/physiogpt/conversations"],
    enabled: !!user,
  });

  // Fetch conversation data
  const { data: conversationData, isLoading: loadingMessages } = useQuery<{
    conversation: PhysioGptConversation;
    messages: PhysioGptMessage[];
  }>({
    queryKey: ["/api/physiogpt/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  // Debug logging for state tracking
  useEffect(() => {
    console.log("selectedConversationId changed:", selectedConversationId);
    console.log("Query enabled:", !!selectedConversationId);
    console.log("loadingMessages:", loadingMessages);
  }, [selectedConversationId, loadingMessages]);

  // Log conversation data when it changes
  useEffect(() => {
    if (conversationData) {
      console.log("Conversation data fetched:", conversationData);
      console.log("Messages in conversation:", conversationData?.messages?.length || 0);
      if (conversationData?.messages?.length > 0) {
        console.log("First message:", conversationData.messages[0]);
        console.log("Last message:", conversationData.messages[conversationData.messages.length - 1]);
      }
    }
  }, [conversationData]);

  // Extract messages from conversation data
  const messages = conversationData?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      console.log("Sending message:", messageContent);
      const response = await apiRequest("POST", "/api/physiogpt/chat", {
        message: messageContent,
        conversationId: selectedConversationId,
        patientContext: selectedBodyRegion ? {
          bodyRegion: selectedBodyRegion,
          regionName: selectedBodyRegionName
        } : undefined
      });
      const result = await response.json();
      console.log("Response received:", result);
      return result;
    },
    onSuccess: (data: PhysioGptResponse) => {
      console.log("Message sent successfully, conversation ID:", data.conversationId);
      console.log("Setting selectedConversationId to:", data.conversationId);
      
      // Set conversation ID first
      setSelectedConversationId(data.conversationId);
      setSuggestions(data.suggestions || []);
      setMessage("");
      
      // Small delay to ensure state is updated before queries
      setTimeout(() => {
        console.log("Invalidating conversation queries for ID:", data.conversationId);
        
        // Invalidate conversations list
        queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
        
        // Force invalidate and refetch the specific conversation
        queryClient.invalidateQueries({ 
          queryKey: ["/api/physiogpt/conversations", data.conversationId] 
        });
        
        // Force refetch
        queryClient.refetchQueries({ 
          queryKey: ["/api/physiogpt/conversations", data.conversationId] 
        });
      }, 100);
    },
    onError: (error: any) => {
      console.error("Send message error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest("DELETE", `/api/physiogpt/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
      setSelectedConversationId(null);
      setSuggestions([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (messageContent?: string) => {
    const content = messageContent || message.trim();
    console.log("handleSendMessage called with:", content);
    if (!content) {
      console.log("No content, returning early");
      return;
    }

    console.log("Calling sendMessageMutation.mutate");
    sendMessageMutation.mutate(content);
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setSuggestions([]);
  };

  const handleDeleteConversation = (conversationId: number) => {
    deleteConversationMutation.mutate(conversationId);
  };

  const handleAssessmentComplete = (results: any) => {
    setAssessmentResults(results);
    setSelectedAssessmentTemplate(null);
    
    // Create a message with assessment results to share with PhysioGPT
    const assessmentSummary = `Assessment completed: ${results.templateName}
Score: ${results.score || 'N/A'}
Interpretation: ${results.interpretation || 'See detailed responses'}
Key findings: ${Object.entries(results.responses).map(([q, a]) => `${q}: ${a}`).join(', ')}
Recommendations: ${results.recommendations?.join('; ') || 'Standard care protocol'}`;
    
    // Switch to chat tab and send assessment results
    setActiveTab("chat");
    handleSendMessage(`Based on this clinical assessment: ${assessmentSummary}. Please provide evidence-based treatment recommendations and next steps.`);
  };

  const handleBodyRegionSelect = (region: string, displayName: string) => {
    setSelectedBodyRegion(region);
    setSelectedBodyRegionName(displayName);
    setShow3DPanel(false);
    
    // Add anatomical context suggestion
    const contextMessage = `I have a question about ${displayName}`;
    setMessage(contextMessage);
    setSuggestions([
      `What are common conditions affecting the ${displayName}?`,
      `Assessment techniques for ${displayName} injuries`,
      `Evidence-based treatment protocols for ${displayName}`,
      `Red flags to screen for in ${displayName} pain`
    ]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationData, shouldAutoScroll]);

  // Auto-select latest conversation when conversations load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const checkScrollPosition = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      setShouldAutoScroll(isAtBottom);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">PhysioGPT</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access your AI physiotherapy assistant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-6rem)]">
          {/* Sidebar - Conversations */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <Button
                    onClick={handleNewConversation}
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-full">
                  {loadingConversations ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-3 rounded-lg border animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-2" />
                          <div className="h-3 bg-gray-200 rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No conversations yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedConversationId === conversation.id
                              ? "bg-blue-50 border-blue-200"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedConversationId(conversation.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {conversation.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-muted-foreground">
                                  {new Date(conversation.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Interface with Tabs */}
          <div className={`${show3DPanel ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all`}>
            <Card className="h-full flex flex-col max-h-[85vh]">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Brain className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        PhysioGPT
                        <Badge variant="secondary" className="text-xs">
                          Clinical AI Assistant
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Evidence-based physiotherapy guidance and clinical assessments
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedBodyRegionName && (
                      <Badge variant="outline" className="text-xs">
                        Context: {selectedBodyRegionName}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShow3DPanel(!show3DPanel)}
                      className="flex items-center gap-2"
                    >
                      <Activity className="h-4 w-4" />
                      {show3DPanel ? 'Hide' : 'Show'} 3D Model
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Tabs */}
              <div className="px-6 pt-2 pb-0 border-b">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="assessments" className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Assessments
                    </TabsTrigger>
                    <TabsTrigger value="protocols" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Protocols
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  {/* Chat Tab */}
                  <TabsContent value="chat" className="flex-1 flex flex-col p-0 min-h-0">
                    <div 
                      ref={scrollAreaRef}
                      className="flex-1 overflow-y-auto px-6 max-h-[50vh]"
                      onScroll={checkScrollPosition}
                    >
                      {!selectedConversationId ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center space-y-4 max-w-md">
                            <div className="p-4 bg-blue-50 rounded-full mx-auto w-fit">
                              <Brain className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold mb-2">
                                Welcome to PhysioGPT
                              </h3>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                Ask me anything about physiotherapy, patient assessment, 
                                treatment planning, or clinical reasoning. I'm here to help 
                                with evidence-based guidance for your practice.
                              </p>
                            </div>
                            
                            <div className="space-y-2 pt-4">
                              <p className="text-sm font-medium text-gray-700">Try asking:</p>
                              <div className="space-y-2">
                                {[
                                  "How should I assess a patient with shoulder impingement?",
                                  "What exercises work best for chronic low back pain?",
                                  "How do I differentiate between different types of headaches?"
                                ].map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="block w-full text-left p-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : loadingMessages ? (
                        <div className="space-y-4 p-4">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex gap-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : messages && messages.length > 0 ? (
                        <div className="space-y-6 p-4">
                          {messages.map((msg: any, index: number) => (
                            <div
                              key={msg?.id || index}
                              className={`flex gap-3 ${
                                msg?.role === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              {msg?.role === "assistant" && (
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-blue-600 text-white">
                                    <Bot className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              
                              <div
                                className={`max-w-[80%] ${
                                  msg?.role === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                                } rounded-lg p-3`}
                              >
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {msg?.content || "No content available"}
                                </div>
                                <div className="text-xs opacity-70 mt-2">
                                  {msg?.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}
                                </div>
                              </div>

                              {msg?.role === "user" && (
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-gray-600 text-white">
                                    <User className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-muted-foreground">
                            <p>No messages in this conversation yet.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-gray-700">
                            Suggested follow-ups:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((suggestion, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Input */}
                    <div className="p-6 border-t flex-shrink-0">
                      <div className="flex gap-3">
                        <Input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Ask about your patients or clinical practice..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={sendMessageMutation.isPending}
                        />
                        <Button
                          onClick={() => handleSendMessage()}
                          disabled={!message.trim() || sendMessageMutation.isPending}
                          size="sm"
                        >
                          {sendMessageMutation.isPending ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Assessments Tab */}
                  <TabsContent value="assessments" className="flex-1 flex flex-col p-0 min-h-0">
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-4">Clinical Assessments</h3>
                        <p className="text-muted-foreground">
                          Assessment tools are being loaded. Please check back shortly.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Protocols Tab */}
                  <TabsContent value="protocols" className="flex-1 flex flex-col p-0 min-h-0">
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-4">Evidence-Based Protocols</h3>
                        <p className="text-muted-foreground">
                          Treatment protocols are being loaded. Please check back shortly.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* 3D Skeleton Panel */}
          {show3DPanel && (
            <div className="lg:col-span-1">
              <InteractiveSkeleton
                onRegionSelect={handleBodyRegionSelect}
                selectedRegion={selectedBodyRegion || undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Activity
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage } from "@shared/schema";
import InteractiveSkeleton from "@/components/3d/InteractiveSkeleton";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<PhysioGptConversation[]>({
    queryKey: ["/api/physiogpt/conversations"],
    enabled: !!user,
  });

  // Fetch current conversation messages
  const { data: conversationData, isLoading: loadingMessages } = useQuery<{
    conversation: PhysioGptConversation;
    messages: ChatMessage[];
  }>({
    queryKey: ["/api/physiogpt/conversations", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const response = await apiRequest("GET", `/api/physiogpt/conversations/${selectedConversationId}`);
      const data = await response.json();
      console.log("Conversation data received:", data);
      return data;
    },
    enabled: !!selectedConversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; conversationId?: number }) => {
      const response = await apiRequest("POST", "/api/physiogpt/chat", data);
      return await response.json() as PhysioGptResponse;
    },
    onSuccess: (data) => {
      setMessage("");
      setSuggestions(data.suggestions || []);
      
      // Set the conversation if it's a new one
      if (!selectedConversationId) {
        setSelectedConversationId(data.conversationId);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations", data.conversationId] });
    },
    onError: (error: any) => {
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
      setSelectedConversationId(null);
      setSuggestions([]);
      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend.trim()) return;

    // Add anatomical context if a body region is selected
    let contextualMessage = textToSend;
    if (selectedBodyRegionName) {
      contextualMessage = `[Context: ${selectedBodyRegionName}] ${textToSend}`;
    }

    sendMessageMutation.mutate({
      message: contextualMessage,
      conversationId: selectedConversationId || undefined,
    });
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setSuggestions([]);
  };

  const handleDeleteConversation = (conversationId: number) => {
    deleteConversationMutation.mutate(conversationId);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  const handleBodyRegionSelect = (regionKey: string, regionName: string) => {
    setSelectedBodyRegion(regionKey);
    setSelectedBodyRegionName(regionName);
    
    // Optionally add a contextual message starter
    if (!message.trim()) {
      setMessage(`I have a question about ${regionName.toLowerCase()}... `);
    }
  };

  // Auto-select latest conversation when conversations load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData?.messages]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Bot className="mx-auto h-12 w-12 text-blue-600" />
              <h2 className="text-2xl font-bold">PhysioGPT</h2>
              <p className="text-muted-foreground">
                Please sign in to access your AI physiotherapy assistant.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">PhysioGPT</h1>
              <p className="text-muted-foreground">
                Your AI assistant for physiotherapy clinical guidance
              </p>
            </div>
          </div>
        </div>

        <div className={`grid gap-6 h-[calc(100vh-200px)] transition-all duration-300 ${
          show3DPanel ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1 lg:grid-cols-4'
        }`}>
          {/* Conversations Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
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
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full px-6 pb-6">
                  {loadingConversations ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
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

          {/* Chat Area */}
          <div className={show3DPanel ? "lg:col-span-3" : "lg:col-span-3"}>
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-blue-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedConversationId && conversationData?.conversation
                          ? conversationData.conversation.title
                          : "New Conversation"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Ask questions about your patients and clinical practice
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedBodyRegionName && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedBodyRegionName}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShow3DPanel(!show3DPanel)}
                      className="h-8"
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      {show3DPanel ? "Hide" : "Show"} 3D
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-6">
                  {!selectedConversationId || (!conversationData && !loadingMessages) ? (
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
                        
                        {/* Sample suggestions for new users */}
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
                  ) : loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-border" />
                    </div>
                  ) : conversationData && conversationData.messages ? (
                    <div className="space-y-6 p-4">
                      {conversationData.messages.map((msg, index) => (
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
                              {msg?.content || ""}
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
                </ScrollArea>

                <Separator />

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="px-6 py-3 border-t bg-gray-50">
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
                <div className="p-6 border-t">
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
              </CardContent>
            </Card>
          </div>

          {/* 3D Skeleton Panel */}
          {show3DPanel && (
            <div className="lg:col-span-1">
              <InteractiveSkeleton
                onRegionSelect={handleBodyRegionSelect}
                selectedRegion={selectedBodyRegion}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
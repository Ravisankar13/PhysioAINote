import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Plus, 
  Menu,
  X,
  Brain,
  Lightbulb,
  Loader2,
  Activity,
  ChevronRight,
  Stethoscope,
  Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage } from "@shared/schema";

interface ChatMessage extends PhysioGptMessage {
  suggestions?: string[];
}

export default function PhysioGPTv2() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Query for conversations list
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/physiogpt/conversations"],
    queryFn: async () => {
      const response = await fetch("/api/physiogpt/conversations");
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    enabled: !!user,
  });

  // Query for selected conversation messages
  const { data: conversationData, isLoading: loadingMessages } = useQuery({
    queryKey: [`/api/physiogpt/conversations/${selectedConversationId}`],
    queryFn: async () => {
      const response = await fetch(`/api/physiogpt/conversations/${selectedConversationId}`);
      if (!response.ok) throw new Error("Failed to fetch conversation");
      return response.json();
    },
    enabled: !!selectedConversationId,
  });

  const messages = conversationData?.messages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest("POST", "/api/physiogpt/chat", {
        message: messageContent,
        conversationId: selectedConversationId,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setSelectedConversationId(data.conversationId);
      setSuggestions(data.suggestions || []);
      setMessage("");
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
        queryClient.invalidateQueries({ 
          queryKey: [`/api/physiogpt/conversations/${data.conversationId}`] 
        });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (messageContent?: string) => {
    const content = messageContent || message.trim();
    if (!content) return;
    sendMessageMutation.mutate(content);
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setSuggestions([
      "How should I assess a patient with shoulder impingement?",
      "What exercises work best for chronic low back pain?",
      "How do I differentiate between different types of headaches?"
    ]);
    setMessage("");
    setSidebarOpen(false);
  };

  const handleConversationSelect = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setSidebarOpen(false);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Conversations List */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 medical-gradient-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Conversations</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:bg-white/20"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* New Conversation Button */}
            <Button
              onClick={handleNewConversation}
              className="w-full mt-4 bg-white/90 text-teal-700 hover:bg-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv: PhysioGptConversation) => (
                  <button
                    key={conv.id}
                    onClick={() => handleConversationSelect(conv.id)}
                    className={`
                      w-full text-left p-3 rounded-lg mb-2 transition-all animate-slide-in
                      ${selectedConversationId === conv.id 
                        ? 'bg-teal-50 border-l-4 border-teal-600' 
                        : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        p-1.5 rounded-lg flex-shrink-0
                        ${selectedConversationId === conv.id 
                          ? 'bg-teal-100' 
                          : 'bg-gray-100'
                        }
                      `}>
                        <MessageCircle className={`
                          h-4 w-4
                          ${selectedConversationId === conv.id 
                            ? 'text-teal-600' 
                            : 'text-gray-600'
                          }
                        `} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {conv.title || "Untitled Conversation"}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold medical-heading">PhysioGPT</h1>
                  <p className="text-xs text-gray-500">AI Clinical Assistant</p>
                </div>
              </div>
            </div>

            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Evidence-Based Guidance
            </Badge>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6" ref={scrollAreaRef}>
          {!selectedConversationId ? (
            <div className="max-w-2xl mx-auto">
              <div className="text-center space-y-6">
                <div className="p-6 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center">
                  <Brain className="h-12 w-12 text-white" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold medical-heading mb-3">
                    Welcome to PhysioGPT
                  </h2>
                  <p className="text-gray-600 medical-body max-w-md mx-auto">
                    Your AI-powered clinical assistant for evidence-based physiotherapy guidance, 
                    assessment protocols, and treatment planning.
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <p className="text-sm font-medium text-gray-700">Start with a question:</p>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSendMessage(suggestion)}
                        className="group w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50/30 transition-all animate-slide-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm medical-body">{suggestion}</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-10 h-10 rounded-full skeleton-loading" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded skeleton-loading" style={{ width: `${70 - i * 10}%` }} />
                    <div className="h-4 rounded skeleton-loading" style={{ width: `${60 - i * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg: ChatMessage, index: number) => (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 animate-slide-in ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-teal-200">
                      <AvatarFallback className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[80%] ${
                    msg.role === "user" 
                      ? "message-bubble-user" 
                      : "message-bubble-assistant"
                  } px-4 py-3`}>
                    <div className="text-sm leading-relaxed">
                      {msg.content}
                    </div>
                    <div className={`text-xs mt-2 ${
                      msg.role === "user" ? "text-white/70" : "text-gray-400"
                    }`}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-gray-200">
                      <AvatarFallback className="bg-gray-100">
                        <User className="h-5 w-5 text-gray-600" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Suggestions Bar */}
        {suggestions.length > 0 && selectedConversationId && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-gray-600">Suggested follow-ups:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(suggestion)}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:border-teal-300 hover:bg-teal-50 transition-all"
                  >
                    {suggestion.length > 40 ? suggestion.substring(0, 40) + "..." : suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder="Ask about assessments, treatments, or clinical reasoning..."
                className="flex-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="medical-button-primary px-6"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for New Conversation */}
      <button
        onClick={handleNewConversation}
        className="floating-action-button lg:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
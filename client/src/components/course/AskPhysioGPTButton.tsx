import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleContent } from "@shared/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AskPhysioGPTButtonProps {
  courseTitle: string;
  moduleTitle: string;
  moduleContent: ModuleContent | null;
  currentSection?: {
    type: string;
    title?: string;
    content?: any;
    index: number;
  };
}

export function AskPhysioGPTButton({ 
  courseTitle, 
  moduleTitle, 
  moduleContent,
  currentSection 
}: AskPhysioGPTButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildContextPrompt = () => {
    let context = `You are PhysioGPT, an expert physiotherapy clinical decision support AI integrated into the PhysioGPT Education Platform.\n\n`;
    context += `Current Context:\n`;
    context += `- Course: ${courseTitle}\n`;
    context += `- Module: ${moduleTitle}\n`;
    
    if (currentSection) {
      context += `- Current Section: ${currentSection.title || currentSection.type} (Type: ${currentSection.type})\n`;
      
      if (currentSection.type === 'text' && currentSection.content) {
        const preview = typeof currentSection.content === 'string' 
          ? currentSection.content.substring(0, 500)
          : '';
        if (preview) {
          context += `- Section Content Preview: ${preview}${currentSection.content.length > 500 ? '...' : ''}\n`;
        }
      }
    }

    context += `\nYour role:\n`;
    context += `- Answer questions about the current course material\n`;
    context += `- Provide clinical reasoning and evidence-based explanations\n`;
    context += `- Clarify physiotherapy concepts and techniques\n`;
    context += `- Suggest related topics or deeper learning paths\n`;
    context += `- Use a professional, educational tone appropriate for healthcare practitioners\n\n`;
    context += `User's question:\n`;

    return context;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const contextPrompt = buildContextPrompt();
      const fullPrompt = contextPrompt + userMessage;

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: fullPrompt }
          ],
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      let assistantMessage = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
      } else {
        console.error("Error:", error);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "I'm sorry, I encountered an error. Please try again." 
        }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        data-testid="button-ask-physiogpt"
        onClick={() => setIsOpen(true)}
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40",
          "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
          "transition-all duration-200 hover:scale-110",
          isOpen && "hidden"
        )}
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Ask PhysioGPT</CardTitle>
                  <CardDescription className="text-xs">Clinical learning assistant</CardDescription>
                </div>
              </div>
              <Button
                data-testid="button-close-chat"
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 px-4">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                  <p className="text-sm mb-2">Ask me anything about:</p>
                  <ul className="text-xs space-y-1">
                    <li>• {moduleTitle}</li>
                    <li>• Clinical reasoning</li>
                    <li>• Evidence-based practice</li>
                    <li>• Related concepts</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-2",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 max-w-[85%] text-sm",
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-muted"
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-2 justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  data-testid="input-chat-message"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  data-testid="button-send-message"
                  type="submit"
                  size="icon"
                  disabled={isLoading || !inputValue.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}

import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Filter,
  Plus,
  Search,
  Download,
  Trash,
  Check,
  BookmarkPlus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";

// Exercise type matching database schema
interface Exercise {
  id: number;
  title: string;
  description: string;
  bodyPart: string;
  targetMuscles: string;
  difficulty: string;
  instructions: string;
  precautions: string | null;
  repetitions: string | null;
  sets: string | null;
  duration: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  aiGenerated: boolean;
}

// Comprehensive exercise illustrations as SVG data URLs
const specificExerciseImages: Record<string, string> = {
  // Shoulder exercises
  "shoulder press": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="20" ry="25" fill="#64748b"/>
      <rect x="85" y="65" width="30" height="60" rx="15" fill="#64748b"/>
      <rect x="75" y="125" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="105" y="125" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="50" y="75" width="15" height="40" rx="7" fill="#64748b" transform="rotate(-45 57.5 95)"/>
      <rect x="135" y="75" width="15" height="40" rx="7" fill="#64748b" transform="rotate(45 142.5 95)"/>
      <rect x="40" y="65" width="25" height="8" rx="4" fill="#374151"/>
      <rect x="135" y="65" width="25" height="8" rx="4" fill="#374151"/>
      <path d="M 55 50 L 55 70 M 50 65 L 55 70 L 60 65" stroke="#ef4444" stroke-width="2" fill="none"/>
      <path d="M 145 50 L 145 70 M 140 65 L 145 70 L 150 65" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Shoulder Press</text>
    </svg>
  `)}`,

  "overhead press": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="20" ry="25" fill="#64748b"/>
      <rect x="85" y="65" width="30" height="60" rx="15" fill="#64748b"/>
      <rect x="75" y="125" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="105" y="125" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="50" y="75" width="15" height="40" rx="7" fill="#64748b" transform="rotate(-45 57.5 95)"/>
      <rect x="135" y="75" width="15" height="40" rx="7" fill="#64748b" transform="rotate(45 142.5 95)"/>
      <rect x="40" y="65" width="25" height="8" rx="4" fill="#374151"/>
      <rect x="135" y="65" width="25" height="8" rx="4" fill="#374151"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Overhead Press</text>
    </svg>
  `)}`,

  "lateral raise": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="20" ry="25" fill="#64748b"/>
      <rect x="85" y="65" width="30" height="60" rx="15" fill="#64748b"/>
      <rect x="75" y="125" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="105" y="125" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="40" y="80" width="15" height="35" rx="7" fill="#64748b" transform="rotate(-90 47.5 97.5)"/>
      <rect x="145" y="80" width="15" height="35" rx="7" fill="#64748b" transform="rotate(90 152.5 97.5)"/>
      <rect x="30" y="87" width="20" height="6" rx="3" fill="#374151"/>
      <rect x="150" y="87" width="20" height="6" rx="3" fill="#374151"/>
      <path d="M 40 110 Q 50 80 60 110" stroke="#ef4444" stroke-width="2" fill="none"/>
      <path d="M 160 110 Q 150 80 140 110" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Lateral Raise</text>
    </svg>
  `)}`,

  "front raise": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="20" ry="25" fill="#64748b"/>
      <rect x="85" y="65" width="30" height="60" rx="15" fill="#64748b"/>
      <rect x="75" y="125" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="105" y="125" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="70" y="75" width="15" height="40" rx="7" fill="#64748b"/>
      <rect x="115" y="75" width="15" height="40" rx="7" fill="#64748b" transform="rotate(-45 122.5 95)"/>
      <rect x="65" y="110" width="25" height="6" rx="3" fill="#374151"/>
      <rect x="105" y="60" width="25" height="6" rx="3" fill="#374151"/>
      <path d="M 115 120 Q 120 80 125 60 M 120 65 L 125 60 L 130 65" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Front Raise</text>
    </svg>
  `)}`,

  "rotator cuff": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="60" cy="80" rx="20" ry="15" fill="#64748b"/>
      <rect x="80" y="70" width="50" height="20" rx="10" fill="#64748b"/>
      <rect x="130" y="80" width="15" height="40" rx="7" fill="#64748b"/>
      <rect x="45" y="85" width="30" height="12" rx="6" fill="#64748b"/>
      <path d="M 75 91 Q 90 85 105 91" stroke="#22c55e" stroke-width="3" fill="none"/>
      <rect x="100" y="88" width="15" height="6" rx="3" fill="#374151"/>
      <path d="M 85 75 Q 95 70 105 75 M 100 72 L 105 75 L 100 78" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">External Rotation</text>
    </svg>
  `)}`,

  "external rotation": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="60" cy="80" rx="20" ry="15" fill="#64748b"/>
      <rect x="80" y="70" width="50" height="20" rx="10" fill="#64748b"/>
      <rect x="130" y="80" width="15" height="40" rx="7" fill="#64748b"/>
      <rect x="45" y="85" width="30" height="12" rx="6" fill="#64748b"/>
      <path d="M 75 91 Q 90 85 105 91" stroke="#22c55e" stroke-width="3" fill="none"/>
      <rect x="100" y="88" width="15" height="6" rx="3" fill="#374151"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">External Rotation</text>
    </svg>
  `)}`,

  // Back exercises
  "pull-up": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="60" y="30" width="80" height="8" rx="4" fill="#374151"/>
      <ellipse cx="100" cy="60" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="82" width="26" height="50" rx="13" fill="#64748b"/>
      <rect x="80" y="132" width="16" height="45" rx="8" fill="#64748b"/>
      <rect x="104" y="132" width="16" height="45" rx="8" fill="#64748b"/>
      <rect x="85" y="38" width="12" height="30" rx="6" fill="#64748b"/>
      <rect x="103" y="38" width="12" height="30" rx="6" fill="#64748b"/>
      <path d="M 100 45 L 100 65 M 95 60 L 100 65 L 105 60" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Pull-up</text>
    </svg>
  `)}`,

  "lat pulldown": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="70" y="20" width="8" height="120" rx="4" fill="#374151"/>
      <rect x="122" y="20" width="8" height="120" rx="4" fill="#374151"/>
      <rect x="70" y="20" width="60" height="8" rx="4" fill="#374151"/>
      <ellipse cx="100" cy="70" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="92" width="26" height="40" rx="13" fill="#64748b"/>
      <rect x="80" y="132" width="16" height="30" rx="8" fill="#64748b"/>
      <rect x="104" y="132" width="16" height="30" rx="8" fill="#64748b"/>
      <rect x="75" y="125" width="50" height="12" rx="6" fill="#6b7280"/>
      <rect x="85" y="55" width="12" height="25" rx="6" fill="#64748b" transform="rotate(-20 91 67.5)"/>
      <rect x="103" y="55" width="12" height="25" rx="6" fill="#64748b" transform="rotate(20 109 67.5)"/>
      <line x1="100" y1="28" x2="100" y2="50" stroke="#22c55e" stroke-width="2"/>
      <rect x="80" y="47" width="40" height="6" rx="3" fill="#374151"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Lat Pulldown</text>
    </svg>
  `)}`,

  "deadlift": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="50" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="72" width="26" height="35" rx="13" fill="#64748b"/>
      <rect x="80" y="107" width="16" height="35" rx="8" fill="#64748b" transform="rotate(10 88 124.5)"/>
      <rect x="104" y="107" width="16" height="35" rx="8" fill="#64748b" transform="rotate(-10 112 124.5)"/>
      <rect x="85" y="80" width="12" height="30" rx="6" fill="#64748b" transform="rotate(10 91 95)"/>
      <rect x="103" y="80" width="12" height="30" rx="6" fill="#64748b" transform="rotate(-10 109 95)"/>
      <rect x="70" y="140" width="60" height="12" rx="6" fill="#374151"/>
      <circle cx="75" cy="146" r="8" fill="#374151"/>
      <circle cx="125" cy="146" r="8" fill="#374151"/>
      <text x="100" y="180" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Deadlift</text>
    </svg>
  `)}`,

  // Hip exercises
  "squat": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="60" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="82" width="26" height="30" rx="13" fill="#64748b"/>
      <rect x="80" y="112" width="16" height="35" rx="8" fill="#64748b" transform="rotate(20 88 129.5)"/>
      <rect x="104" y="112" width="16" height="35" rx="8" fill="#64748b" transform="rotate(-20 112 129.5)"/>
      <rect x="70" y="85" width="12" height="25" rx="6" fill="#64748b" transform="rotate(-30 76 97.5)"/>
      <rect x="118" y="85" width="12" height="25" rx="6" fill="#64748b" transform="rotate(30 124 97.5)"/>
      <path d="M 100 45 L 100 65 M 95 60 L 100 65 L 105 60" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Squat</text>
    </svg>
  `)}`,

  "hip thrust": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="40" y="80" width="60" height="15" rx="7" fill="#6b7280"/>
      <ellipse cx="70" cy="70" rx="18" ry="15" fill="#64748b"/>
      <rect x="95" y="110" width="50" height="20" rx="10" fill="#64748b"/>
      <rect x="90" y="130" width="16" height="30" rx="8" fill="#64748b" transform="rotate(-90 98 145)"/>
      <rect x="134" y="130" width="16" height="30" rx="8" fill="#64748b" transform="rotate(-90 142 145)"/>
      <rect x="90" y="105" width="60" height="8" rx="4" fill="#374151"/>
      <circle cx="95" cy="109" r="6" fill="#374151"/>
      <circle cx="145" cy="109" r="6" fill="#374151"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Hip Thrust</text>
    </svg>
  `)}`,

  "lunge": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="50" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="72" width="26" height="35" rx="13" fill="#64748b"/>
      <rect x="90" y="107" width="16" height="30" rx="8" fill="#64748b" transform="rotate(10 98 122)"/>
      <rect x="100" y="107" width="16" height="35" rx="8" fill="#64748b" transform="rotate(-45 108 124.5)"/>
      <rect x="85" y="75" width="12" height="25" rx="6" fill="#64748b"/>
      <rect x="103" y="75" width="12" height="25" rx="6" fill="#64748b"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Lunge</text>
    </svg>
  `)}`,

  // Core exercises
  "plank": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="70" cy="90" rx="15" ry="18" fill="#64748b"/>
      <rect x="85" y="85" width="60" height="18" rx="9" fill="#64748b"/>
      <rect x="145" y="88" width="20" height="12" rx="6" fill="#64748b"/>
      <rect x="165" y="95" width="15" height="25" rx="7" fill="#64748b"/>
      <rect x="40" y="88" width="15" height="15" rx="7" fill="#64748b"/>
      <rect x="55" y="95" width="15" height="25" rx="7" fill="#64748b"/>
      <line x1="62" y1="97" x2="175" y2="97" stroke="#22c55e" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Plank</text>
    </svg>
  `)}`,

  "push-up": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="70" cy="80" rx="15" ry="18" fill="#64748b"/>
      <rect x="85" y="75" width="60" height="18" rx="9" fill="#64748b"/>
      <rect x="145" y="78" width="20" height="12" rx="6" fill="#64748b"/>
      <rect x="165" y="85" width="15" height="25" rx="7" fill="#64748b"/>
      <rect x="40" y="78" width="15" height="20" rx="7" fill="#64748b"/>
      <rect x="55" y="95" width="15" height="25" rx="7" fill="#64748b"/>
      <path d="M 70 65 L 70 85 M 65 80 L 70 85 L 75 80" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Push-up</text>
    </svg>
  `)}`,

  // Arm exercises
  "bicep curl": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="62" width="26" height="50" rx="13" fill="#64748b"/>
      <rect x="80" y="112" width="16" height="40" rx="8" fill="#64748b"/>
      <rect x="104" y="112" width="16" height="40" rx="8" fill="#64748b"/>
      <rect x="75" y="70" width="12" height="25" rx="6" fill="#64748b"/>
      <rect x="103" y="70" width="12" height="25" rx="6" fill="#64748b" transform="rotate(-45 109 82.5)"/>
      <rect x="70" y="90" width="20" height="6" rx="3" fill="#374151"/>
      <rect x="95" y="55" width="20" height="6" rx="3" fill="#374151"/>
      <path d="M 125 95 Q 115 70 105 65 M 110 68 L 105 65 L 108 60" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Bicep Curl</text>
    </svg>
  `)}`,

  // Leg exercises
  "calf raise": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="62" width="26" height="50" rx="13" fill="#64748b"/>
      <rect x="80" y="112" width="16" height="35" rx="8" fill="#64748b"/>
      <rect x="104" y="112" width="16" height="35" rx="8" fill="#64748b"/>
      <rect x="70" y="147" width="60" height="8" rx="4" fill="#6b7280"/>
      <ellipse cx="88" cy="145" rx="8" ry="4" fill="#64748b"/>
      <ellipse cx="112" cy="145" rx="8" ry="4" fill="#64748b"/>
      <path d="M 100 35 L 100 55 M 95 50 L 100 55 L 105 50" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="180" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Calf Raise</text>
    </svg>
  `)}`,

  // Additional specific exercises
  "leg extension": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="60" y="100" width="80" height="15" rx="7" fill="#6b7280"/>
      <ellipse cx="100" cy="70" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="92" width="26" height="25" rx="13" fill="#64748b"/>
      <rect x="80" y="117" width="16" height="25" rx="8" fill="#64748b"/>
      <rect x="104" y="117" width="16" height="25" rx="8" fill="#64748b" transform="rotate(-45 112 129.5)"/>
      <circle cx="100" cy="115" r="5" fill="#374151"/>
      <path d="M 112 135 Q 125 125 135 135 M 130 132 L 135 135 L 130 138" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Leg Extension</text>
    </svg>
  `)}`,

  "leg curl": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="60" y="100" width="80" height="15" rx="7" fill="#6b7280"/>
      <ellipse cx="100" cy="85" rx="18" ry="15" fill="#64748b"/>
      <rect x="87" y="100" width="26" height="25" rx="13" fill="#64748b"/>
      <rect x="80" y="125" width="16" height="25" rx="8" fill="#64748b"/>
      <rect x="104" y="125" width="16" height="25" rx="8" fill="#64748b" transform="rotate(45 112 137.5)"/>
      <circle cx="100" cy="115" r="5" fill="#374151"/>
      <path d="M 112 150 Q 105 160 95 150 M 100 153 L 95 150 L 100 147" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Leg Curl</text>
    </svg>
  `)}`,

  "step up": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="70" y="140" width="60" height="20" rx="10" fill="#6b7280"/>
      <ellipse cx="100" cy="50" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="72" width="26" height="35" rx="13" fill="#64748b"/>
      <rect x="80" y="107" width="16" height="30" rx="8" fill="#64748b"/>
      <rect x="104" y="107" width="16" height="30" rx="8" fill="#64748b" transform="rotate(-30 112 122)"/>
      <rect x="85" y="75" width="12" height="25" rx="6" fill="#64748b"/>
      <rect x="103" y="75" width="12" height="25" rx="6" fill="#64748b"/>
      <path d="M 100 35 L 100 55 M 95 50 L 100 55 L 105 50" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Step Up</text>
    </svg>
  `)}`,

  "glute bridge": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="80" cy="80" rx="18" ry="15" fill="#64748b"/>
      <rect x="95" y="110" width="40" height="20" rx="10" fill="#64748b"/>
      <rect x="90" y="130" width="16" height="25" rx="8" fill="#64748b" transform="rotate(-90 98 142.5)"/>
      <rect x="124" y="130" width="16" height="25" rx="8" fill="#64748b" transform="rotate(-90 132 142.5)"/>
      <rect x="65" y="85" width="12" height="20" rx="6" fill="#64748b"/>
      <rect x="118" y="85" width="12" height="20" rx="6" fill="#64748b"/>
      <path d="M 115 105 L 115 125 M 110 120 L 115 125 L 120 120" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Glute Bridge</text>
    </svg>
  `)}`,

  "side plank": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="70" cy="80" rx="15" ry="18" fill="#64748b"/>
      <rect x="85" y="75" width="60" height="18" rx="9" fill="#64748b" transform="rotate(15 115 84)"/>
      <rect x="145" y="85" width="20" height="12" rx="6" fill="#64748b" transform="rotate(15 155 91)"/>
      <rect x="162" y="95" width="15" height="25" rx="7" fill="#64748b" transform="rotate(15 169.5 107.5)"/>
      <rect x="40" y="75" width="15" height="25" rx="7" fill="#64748b"/>
      <rect x="55" y="95" width="15" height="25" rx="7" fill="#64748b"/>
      <path d="M 85 60 L 165 80" stroke="#22c55e" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Side Plank</text>
    </svg>
  `)}`,

  "tricep extension": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="62" width="26" height="50" rx="13" fill="#64748b"/>
      <rect x="80" y="112" width="16" height="40" rx="8" fill="#64748b"/>
      <rect x="104" y="112" width="16" height="40" rx="8" fill="#64748b"/>
      <rect x="105" y="70" width="12" height="25" rx="6" fill="#64748b" transform="rotate(-135 111 82.5)"/>
      <rect x="110" y="55" width="20" height="6" rx="3" fill="#374151"/>
      <path d="M 125 75 Q 115 55 105 65 M 110 62 L 105 65 L 108 70" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Tricep Extension</text>
    </svg>
  `)}`,

  "hammer curl": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="62" width="26" height="50" rx="13" fill="#64748b"/>
      <rect x="80" y="112" width="16" height="40" rx="8" fill="#64748b"/>
      <rect x="104" y="112" width="16" height="40" rx="8" fill="#64748b"/>
      <rect x="75" y="70" width="12" height="25" rx="6" fill="#64748b"/>
      <rect x="103" y="70" width="12" height="25" rx="6" fill="#64748b" transform="rotate(-45 109 82.5)"/>
      <rect x="70" y="90" width="6" height="20" rx="3" fill="#374151"/>
      <rect x="95" y="55" width="6" height="20" rx="3" fill="#374151"/>
      <path d="M 125 95 Q 115 70 105 65 M 110 68 L 105 65 L 108 60" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Hammer Curl</text>
    </svg>
  `)}`,

  "shrug": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="50" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="72" width="26" height="50" rx="13" fill="#64748b"/>
      <rect x="80" y="122" width="16" height="40" rx="8" fill="#64748b"/>
      <rect x="104" y="122" width="16" height="40" rx="8" fill="#64748b"/>
      <rect x="75" y="80" width="12" height="30" rx="6" fill="#64748b"/>
      <rect x="113" y="80" width="12" height="30" rx="6" fill="#64748b"/>
      <rect x="70" y="105" width="20" height="6" rx="3" fill="#374151"/>
      <rect x="110" y="105" width="20" height="6" rx="3" fill="#374151"/>
      <path d="M 87 60 L 87 40 M 82 45 L 87 40 L 92 45" stroke="#ef4444" stroke-width="2" fill="none"/>
      <path d="M 113 60 L 113 40 M 108 45 L 113 40 L 118 45" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Shrug</text>
    </svg>
  `)}`,

  "seated row": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="75" y="125" width="50" height="12" rx="6" fill="#6b7280"/>
      <ellipse cx="100" cy="70" rx="18" ry="22" fill="#64748b"/>
      <rect x="87" y="92" width="26" height="40" rx="13" fill="#64748b"/>
      <rect x="80" y="132" width="16" height="30" rx="8" fill="#64748b"/>
      <rect x="104" y="132" width="16" height="30" rx="8" fill="#64748b"/>
      <rect x="85" y="85" width="12" height="25" rx="6" fill="#64748b" transform="rotate(-20 91 97.5)"/>
      <rect x="103" y="85" width="12" height="25" rx="6" fill="#64748b" transform="rotate(20 109 97.5)"/>
      <line x1="100" y1="100" x2="150" y2="100" stroke="#22c55e" stroke-width="2"/>
      <rect x="80" y="97" width="40" height="6" rx="3" fill="#374151"/>
      <path d="M 150 100 L 130 100 M 135 95 L 130 100 L 135 105" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Seated Row</text>
    </svg>
  `)}`,

  "crunch": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="90" cy="70" rx="18" ry="22" fill="#64748b"/>
      <rect x="77" y="92" width="26" height="35" rx="13" fill="#64748b" transform="rotate(15 90 109.5)"/>
      <rect x="70" y="127" width="16" height="35" rx="8" fill="#64748b" transform="rotate(45 78 144.5)"/>
      <rect x="94" y="127" width="16" height="35" rx="8" fill="#64748b" transform="rotate(-45 102 144.5)"/>
      <rect x="65" y="75" width="12" height="20" rx="6" fill="#64748b" transform="rotate(-30 71 85)"/>
      <rect x="103" y="75" width="12" height="20" rx="6" fill="#64748b" transform="rotate(30 109 85)"/>
      <path d="M 90 55 Q 95 40 105 55 M 100 52 L 105 55 L 100 58" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Crunch</text>
    </svg>
  `)}`,

  "mountain climber": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="70" cy="75" rx="15" ry="18" fill="#64748b"/>
      <rect x="85" y="70" width="50" height="18" rx="9" fill="#64748b"/>
      <rect x="135" y="73" width="20" height="12" rx="6" fill="#64748b"/>
      <rect x="155" y="80" width="15" height="25" rx="7" fill="#64748b"/>
      <rect x="40" y="73" width="15" height="20" rx="7" fill="#64748b"/>
      <rect x="55" y="90" width="15" height="25" rx="7" fill="#64748b"/>
      <rect x="90" y="88" width="15" height="25" rx="7" fill="#64748b" transform="rotate(45 97.5 100.5)"/>
      <path d="M 97 110 Q 90 120 80 110 M 85 113 L 80 110 L 85 107" stroke="#ef4444" stroke-width="2" fill="none"/>
      <path d="M 97 110 Q 110 100 120 110 M 115 107 L 120 110 L 115 113" stroke="#22c55e" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Mountain Climber</text>
    </svg>
  `)}`,

  "burpee": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="40" rx="15" ry="18" fill="#64748b"/>
      <rect x="90" y="58" width="20" height="40" rx="10" fill="#64748b"/>
      <rect x="85" y="98" width="12" height="30" rx="6" fill="#64748b"/>
      <rect x="103" y="98" width="12" height="30" rx="6" fill="#64748b"/>
      <rect x="85" y="65" width="10" height="20" rx="5" fill="#64748b" transform="rotate(-45 90 75)"/>
      <rect x="105" y="65" width="10" height="20" rx="5" fill="#64748b" transform="rotate(45 110 75)"/>
      <path d="M 100 25 L 100 45 M 95 40 L 100 45 L 105 40" stroke="#ef4444" stroke-width="2" fill="none"/>
      <path d="M 100 140 L 100 160 M 95 155 L 100 160 L 105 155" stroke="#22c55e" stroke-width="2" fill="none"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Burpee</text>
    </svg>
  `)}`,

  // Default exercise illustration
  "default": `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="50" rx="20" ry="25" fill="#64748b"/>
      <rect x="85" y="75" width="30" height="60" rx="15" fill="#64748b"/>
      <rect x="75" y="135" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="105" y="135" width="20" height="50" rx="10" fill="#64748b"/>
      <rect x="65" y="85" width="15" height="35" rx="7" fill="#64748b"/>
      <rect x="120" y="85" width="15" height="35" rx="7" fill="#64748b"/>
      <circle cx="100" cy="100" r="25" fill="none" stroke="#3b82f6" stroke-width="3"/>
      <text x="100" y="105" text-anchor="middle" font-family="Arial" font-size="20" fill="#3b82f6" font-weight="bold">E</text>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Exercise</text>
    </svg>
  `)}`
};

// Body part default illustrations using SVG
const bodyPartImages: Record<string, string> = {
  shoulder: specificExerciseImages["shoulder press"],
  neck: `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <ellipse cx="100" cy="50" rx="20" ry="25" fill="#64748b"/>
      <rect x="85" y="75" width="30" height="40" rx="15" fill="#64748b"/>
      <path d="M 80 45 Q 75 35 85 30 M 82 33 L 85 30 L 88 33" stroke="#ef4444" stroke-width="2" fill="none"/>
      <path d="M 120 45 Q 125 35 115 30 M 118 33 L 115 30 L 112 33" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Neck Exercise</text>
    </svg>
  `)}`,
  back: specificExerciseImages["pull-up"],
  elbow: specificExerciseImages["bicep curl"],
  wrist: `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="85" y="80" width="30" height="60" rx="15" fill="#64748b"/>
      <rect x="65" y="90" width="15" height="35" rx="7" fill="#64748b"/>
      <rect x="120" y="90" width="15" height="35" rx="7" fill="#64748b"/>
      <ellipse cx="57" cy="125" rx="8" ry="12" fill="#64748b"/>
      <ellipse cx="143" cy="125" rx="8" ry="12" fill="#64748b"/>
      <path d="M 50 135 Q 45 140 50 145 M 47 142 L 50 145 L 53 142" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Wrist Exercise</text>
    </svg>
  `)}`,
  hand: `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <path d="M 80 120 Q 85 100 100 100 Q 115 100 120 120 L 120 140 Q 118 150 110 150 L 90 150 Q 82 150 80 140 Z" fill="#64748b"/>
      <rect x="95" y="85" width="6" height="20" rx="3" fill="#64748b"/>
      <rect x="102" y="80" width="6" height="25" rx="3" fill="#64748b"/>
      <rect x="109" y="85" width="6" height="20" rx="3" fill="#64748b"/>
      <ellipse cx="75" cy="125" rx="8" ry="15" fill="#64748b"/>
      <path d="M 90 105 Q 85 100 90 95" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Hand Exercise</text>
    </svg>
  `)}`,
  hip: specificExerciseImages["hip thrust"],
  knee: specificExerciseImages["leg extension"],
  ankle: specificExerciseImages["calf raise"],
  foot: `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8fafc"/>
      <rect x="85" y="60" width="30" height="60" rx="15" fill="#64748b"/>
      <rect x="90" y="120" width="20" height="40" rx="10" fill="#64748b"/>
      <ellipse cx="100" cy="170" rx="25" ry="10" fill="#64748b"/>
      <ellipse cx="125" cy="168" rx="8" ry="6" fill="#64748b"/>
      <path d="M 110 175 Q 115 185 120 175" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="100" y="195" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Foot Exercise</text>
    </svg>
  `)}`,
  general: specificExerciseImages["default"]
};

// Exercise card component
function ExerciseCard({
  exercise,
  isSelected = false,
  onToggleSelect,
}: {
  exercise: Exercise;
  isSelected?: boolean;
  onToggleSelect?: (exercise: Exercise) => void;
}) {
  // Find the most appropriate image for the exercise
  const getImageUrl = () => {
    // Use custom image if available
    if (exercise.imageUrl) return exercise.imageUrl;

    // Convert title, description, and target muscles to lowercase for matching
    const title = exercise.title.toLowerCase();
    const description = exercise.description.toLowerCase();
    const targetMuscles = exercise.targetMuscles.toLowerCase();
    const instructions = exercise.instructions.toLowerCase();

    // Combine all text for comprehensive matching
    const allText = `${title} ${description} ${targetMuscles} ${instructions}`;

    // Create a scoring system for better matches
    let bestMatch = "";
    let bestScore = 0;

    // Find a specific exercise image by looking for keywords in all the text
    for (const [keyword, imageUrl] of Object.entries(specificExerciseImages)) {
      // Title match is highest priority
      if (title.includes(keyword)) {
        return imageUrl; // Immediate match if keyword is in title
      }

      // Check how many times the keyword appears in all text
      const matches = (allText?.match(new RegExp(keyword, "g")) || []).length;
      if (matches > bestScore) {
        bestScore = matches;
        bestMatch = imageUrl;
      }
    }

    // If we found any match in the combined text, use it
    if (bestMatch && bestScore > 0) {
      return bestMatch;
    }

    // Fall back to body part image if no specific exercise match
    return bodyPartImages[exercise.bodyPart] || bodyPartImages.general;
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(exercise);
    }
  };

  return (
    <Card
      className={`h-full flex flex-col hover:shadow-md transition-shadow duration-300 ${
        isSelected ? "border-primary border-2" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-2 flex-1">
            {onToggleSelect && (
              <Button
                variant={isSelected ? "default" : "outline"}
                size="icon"
                className="h-7 w-7 rounded-full flex-shrink-0 mt-0.5"
                onClick={handleSelectClick}
              >
                {isSelected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
              </Button>
            )}
            <CardTitle className="text-lg line-clamp-2">
              {exercise.title}
            </CardTitle>
          </div>
          <Badge
            variant={
              exercise.difficulty === "beginner"
                ? "outline"
                : exercise.difficulty === "intermediate"
                ? "secondary"
                : "default"
            }
            className="whitespace-nowrap"
          >
            {exercise.difficulty}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 mt-1">
          {exercise.description}
        </CardDescription>
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className="capitalize">
            {exercise.bodyPart}
          </Badge>
          {exercise.aiGenerated && (
            <Badge variant="secondary">AI Generated</Badge>
          )}
        </div>
      </CardHeader>

      {/* Image Display - Always show an image (either custom or default) */}
      <div className="px-6 pb-2">
        <div className="relative w-full h-48 overflow-hidden rounded-md bg-muted">
          <img
            src={getImageUrl()}
            alt={`${exercise.title} exercise`}
            className="object-cover w-full h-full"
            onError={(e) => {
              // If custom image fails, try to fallback to default
              const target = e.target as HTMLImageElement;
              if (
                target.src !== bodyPartImages[exercise.bodyPart] &&
                bodyPartImages[exercise.bodyPart]
              ) {
                target.src = bodyPartImages[exercise.bodyPart];
              } else if (target.src !== bodyPartImages.general) {
                target.src = bodyPartImages.general;
              } else {
                // If all fallbacks fail, hide the image
                target.style.display = "none";
              }
            }}
          />
        </div>
      </div>

      {/* Video Display */}
      {exercise.videoUrl && (
        <div className="px-6 pb-2">
          <div className="relative w-full h-48 overflow-hidden rounded-md bg-muted">
            <video
              src={exercise.videoUrl}
              controls
              className="object-cover w-full h-full"
              onError={(e) => {
                // Hide broken videos
                (e.target as HTMLVideoElement).style.display = "none";
              }}
            />
          </div>
        </div>
      )}

      <CardContent className="flex-grow py-2">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="instructions" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline hover:text-primary">
              <span className="underline underline-offset-4">Instructions</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="whitespace-pre-wrap text-sm">
                {exercise.instructions}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline hover:text-primary">
              <span className="underline underline-offset-4">
                Target Muscles
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="whitespace-pre-wrap text-sm">
                {exercise.targetMuscles}
              </div>
            </AccordionContent>
          </AccordionItem>

          {exercise.precautions && (
            <AccordionItem value="precautions" className="border-b-0">
              <AccordionTrigger className="py-2 text-sm hover:no-underline hover:text-primary">
                <span className="underline underline-offset-4">
                  Precautions
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="whitespace-pre-wrap text-sm">
                  {exercise.precautions}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>

      <CardFooter className="flex flex-col items-start border-t pt-3 pb-3">
        <div className="flex flex-wrap w-full gap-3 text-xs">
          {exercise.repetitions && (
            <div className="bg-muted rounded-md px-2 py-1 flex items-center">
              <span className="font-medium mr-1">Reps:</span>
              {exercise.repetitions}
            </div>
          )}

          {exercise.sets && (
            <div className="bg-muted rounded-md px-2 py-1 flex items-center">
              <span className="font-medium mr-1">Sets:</span>
              {exercise.sets}
            </div>
          )}

          {exercise.duration && (
            <div className="bg-muted rounded-md px-2 py-1 flex items-center">
              <span className="font-medium mr-1">Duration:</span>
              {exercise.duration}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Exercise list component
export default function ExerciseList() {
  // State for exercise program
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [programName, setProgramName] = useState("My Exercise Program");
  const [isProgramSheetOpen, setIsProgramSheetOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State for filters
  const [bodyPart, setBodyPart] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const exercisesPerPage = 6; // Number of exercises per page

  // Fetch exercises with filters
  const {
    data: exercises,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises", bodyPart, difficulty],
    queryFn: async () => {
      let url = "/api/exercises";

      // Add query parameters if filters are set
      const params = new URLSearchParams();
      if (bodyPart) params.append("bodyPart", bodyPart);
      if (difficulty) params.append("difficulty", difficulty);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      return fetch(url).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch exercises");
        return res.json();
      });
    },
  });

  // Fetch all exercises for search functionality
  const { data: allExercises, isLoading: allExercisesLoading } = useQuery<
    Exercise[]
  >({
    queryKey: ["/api/exercises", "all"],
    queryFn: async () => {
      return fetch("/api/exercises?all=true").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch all exercises");
        return res.json();
      });
    },
    enabled: isSearching || searchQuery.length > 2,
  });

  // Search function
  const searchResults = React.useMemo(() => {
    if (!searchQuery || searchQuery.length < 3 || !allExercises) return null;

    const query = searchQuery.toLowerCase();
    return allExercises.filter((exercise) => {
      return (
        exercise.title.toLowerCase().includes(query) ||
        exercise.description.toLowerCase().includes(query) ||
        exercise.instructions.toLowerCase().includes(query) ||
        (exercise.targetMuscles &&
          exercise.targetMuscles.toLowerCase().includes(query)) ||
        (exercise.precautions &&
          exercise.precautions.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, allExercises]);

  // Filter exercises by tab (only when not searching)
  const filteredExercises =
    searchResults ||
    exercises?.filter((exercise) => {
      if (activeTab === "all") return true;
      return exercise.bodyPart === activeTab;
    });

  // Calculate pagination
  const totalExercises = filteredExercises?.length || 0;
  const totalPages = Math.ceil(totalExercises / exercisesPerPage);

  // Get current page exercises
  const currentExercises = filteredExercises
    ? filteredExercises.slice(
        (currentPage - 1) * exercisesPerPage,
        currentPage * exercisesPerPage
      )
    : [];

  // Handle exercise generation
  // Handle exercise selection
  const handleToggleSelect = (exercise: Exercise) => {
    setSelectedExercises((prev) => {
      const isSelected = prev.some((ex) => ex.id === exercise.id);
      if (isSelected) {
        return prev.filter((ex) => ex.id !== exercise.id);
      } else {
        return [...prev, exercise];
      }
    });
  };

  // Check if an exercise is selected
  const isExerciseSelected = (exercise: Exercise) => {
    return selectedExercises.some((ex) => ex.id === exercise.id);
  };

  // Clear all selected exercises
  const clearSelectedExercises = () => {
    setSelectedExercises([]);
  };

  // Generate PDF for the exercise program
  const generatePDF = () => {
    if (selectedExercises.length === 0) {
      toast({
        title: "No exercises selected",
        description: "Please select at least one exercise to create a program.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add program title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(programName, 105, 20, { align: "center" });

      // Add date
      doc.setFontSize(10);
      doc.text(`Created: ${new Date().toLocaleDateString()}`, 105, 30, {
        align: "center",
      });

      // Add exercises
      doc.setFontSize(12);
      let y = 45;

      selectedExercises.forEach((exercise, index) => {
        // If we're about to go off the page, add a new page
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        // Add exercise title
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 150);
        doc.text(`${index + 1}. ${exercise.title}`, 20, y);
        y += 8;

        // Add body part and difficulty
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Body Part: ${exercise.bodyPart} | Difficulty: ${exercise.difficulty}`,
          20,
          y
        );
        y += 6;

        // Add description
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        const splitDescription = doc.splitTextToSize(exercise.description, 170);
        doc.text(splitDescription, 20, y);
        y += splitDescription.length * 5 + 4;

        // Add instructions
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("Instructions:", 20, y);
        y += 5;

        const splitInstructions = doc.splitTextToSize(
          exercise.instructions,
          170
        );
        doc.text(splitInstructions, 25, y);
        y += splitInstructions.length * 5 + 4;

        // Add reps/sets/duration if available
        let repInfo = "";
        if (exercise.repetitions) repInfo += `Reps: ${exercise.repetitions} `;
        if (exercise.sets) repInfo += `Sets: ${exercise.sets} `;
        if (exercise.duration) repInfo += `Duration: ${exercise.duration}`;

        if (repInfo) {
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(repInfo, 20, y);
          y += 5;
        }

        // Add space between exercises
        y += 8;
      });

      // Save the PDF
      doc.save(`${programName.replace(/\s+/g, "_")}.pdf`);

      toast({
        title: "PDF Generated",
        description: "Your exercise program has been downloaded as a PDF.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
      setIsProgramSheetOpen(false);
    }
  };

  const handleGenerateExercises = async (
    bodyPart: string,
    difficulty: string,
    count: number = 3
  ) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to generate exercises.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      const response = await fetch("/api/exercises/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bodyPart, difficulty, count }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate exercises");
      }

      const generatedExercises = await response.json();

      toast({
        title: "Exercises Generated",
        description: `Successfully generated ${generatedExercises.length} new exercises.`,
      });

      // Refetch exercises to include newly generated ones
      refetch();

      // Set filters to match the generated exercises
      setBodyPart(bodyPart);
      setDifficulty(difficulty);
      setActiveTab(bodyPart);
    } catch (error) {
      console.error("Error generating exercises:", error);
      toast({
        title: "Generation Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Reset filters
  const resetFilters = () => {
    setBodyPart("");
    setDifficulty("");
    setCurrentPage(1); // Reset to first page when filters change
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">
          Error loading exercises:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Exercise Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse evidence-based exercises for different body parts and
            difficulty levels
          </p>
        </div>

        <div className="flex mt-4 md:mt-0 space-x-2">
          {/* Search Bar */}
          <div className="relative w-full md:w-64 mr-2">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="search"
              placeholder="Search exercises..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
                if (e.target.value.length > 2) {
                  setIsSearching(true);
                } else {
                  setIsSearching(false);
                }
              }}
            />
          </div>

          {/* Program Creation */}
          <Sheet open={isProgramSheetOpen} onOpenChange={setIsProgramSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant={selectedExercises.length > 0 ? "default" : "outline"}
                className="gap-2"
                disabled={selectedExercises.length === 0}
              >
                <Download className="h-4 w-4" />
                Program ({selectedExercises.length})
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create Exercise Program</SheetTitle>
                <SheetDescription>
                  Create a downloadable PDF with your selected exercises.
                </SheetDescription>
              </SheetHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="program-name">Program Name</Label>
                  <Input
                    id="program-name"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="My Exercise Program"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Selected Exercises ({selectedExercises.length})</Label>
                  <div className="border rounded-md p-2 max-h-[400px] overflow-y-auto">
                    {selectedExercises.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2 text-center">
                        No exercises selected. Select exercises from the library
                        first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedExercises.map((exercise) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between p-2 border rounded-md"
                          >
                            <div>
                              <p className="font-medium">{exercise.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {exercise.bodyPart} | {exercise.difficulty}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleSelect(exercise)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="pt-2">
                <Button
                  onClick={generatePDF}
                  disabled={selectedExercises.length === 0 || isGeneratingPdf}
                  className="w-full"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Clear Selection Button */}
          {selectedExercises.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={clearSelectedExercises}
              className="h-9 w-9 ml-2"
              title="Clear selection"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}

          {/* Filters */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 ml-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Exercises</SheetTitle>
                <SheetDescription>
                  Narrow down exercises by body part and difficulty level
                </SheetDescription>
              </SheetHeader>

              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bodyPart">Body Part</Label>
                  <Select value={bodyPart} onValueChange={setBodyPart}>
                    <SelectTrigger id="bodyPart">
                      <SelectValue placeholder="All body parts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All body parts</SelectItem>
                      <SelectItem value="shoulder">Shoulder</SelectItem>
                      <SelectItem value="neck">Neck</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="elbow">Elbow</SelectItem>
                      <SelectItem value="wrist">Wrist</SelectItem>
                      <SelectItem value="hand">Hand</SelectItem>
                      <SelectItem value="hip">Hip</SelectItem>
                      <SelectItem value="knee">Knee</SelectItem>
                      <SelectItem value="ankle">Ankle</SelectItem>
                      <SelectItem value="foot">Foot</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger id="difficulty">
                      <SelectValue placeholder="All difficulty levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All difficulty levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
                <Button onClick={() => refetch()}>Apply Filters</Button>
              </div>
            </SheetContent>
          </Sheet>

          {user && (
            <Sheet>
              <SheetTrigger asChild>
                <Button className="gap-2" variant="default">
                  <Plus className="h-4 w-4" />
                  Generate
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Generate Exercises</SheetTitle>
                  <SheetDescription>
                    Create AI-generated exercises for specific body parts
                  </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="genBodyPart">Body Part</Label>
                    <Select value={bodyPart} onValueChange={setBodyPart}>
                      <SelectTrigger id="genBodyPart">
                        <SelectValue placeholder="Select body part" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shoulder">Shoulder</SelectItem>
                        <SelectItem value="neck">Neck</SelectItem>
                        <SelectItem value="back">Back</SelectItem>
                        <SelectItem value="elbow">Elbow</SelectItem>
                        <SelectItem value="wrist">Wrist</SelectItem>
                        <SelectItem value="hand">Hand</SelectItem>
                        <SelectItem value="hip">Hip</SelectItem>
                        <SelectItem value="knee">Knee</SelectItem>
                        <SelectItem value="ankle">Ankle</SelectItem>
                        <SelectItem value="foot">Foot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genDifficulty">Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="genDifficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerateExercises(bodyPart, difficulty)}
                  disabled={!bodyPart || !difficulty}
                  className="w-full"
                >
                  Generate Exercises
                </Button>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {searchQuery && searchQuery.length > 2 ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">
            {searchResults && searchResults.length > 0
              ? `Search results for "${searchQuery}"`
              : `No results found for "${searchQuery}"`}
          </h2>
          {searchResults && searchResults.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentExercises?.map((exercise) => (
                <div key={exercise.id} className="relative">
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge className="capitalize">{exercise.bodyPart}</Badge>
                  </div>
                  <ExerciseCard
                    exercise={exercise}
                    isSelected={isExerciseSelected(exercise)}
                    onToggleSelect={handleToggleSelect}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setCurrentPage(1); // Reset to first page when changing tabs
          }}
        >
          <TabsList className="mb-4 flex overflow-x-auto pb-2 max-w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="shoulder">Shoulder</TabsTrigger>
            <TabsTrigger value="neck">Neck</TabsTrigger>
            <TabsTrigger value="back">Back</TabsTrigger>
            <TabsTrigger value="elbow">Elbow</TabsTrigger>
            <TabsTrigger value="wrist">Wrist</TabsTrigger>
            <TabsTrigger value="hand">Hand</TabsTrigger>
            <TabsTrigger value="hip">Hip</TabsTrigger>
            <TabsTrigger value="knee">Knee</TabsTrigger>
            <TabsTrigger value="ankle">Ankle</TabsTrigger>
            <TabsTrigger value="foot">Foot</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {filteredExercises && filteredExercises.length > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {currentExercises?.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      isSelected={isExerciseSelected(exercise)}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center py-10 text-muted-foreground">
                No exercises found for the selected filters.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <div className="hidden sm:flex items-center space-x-2 mr-2 text-sm text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </div>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                />
              </PaginationItem>
            )}

            {/* Display limited page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Always show first and last page
                if (page === 1 || page === totalPages) return true;
                // Show pages near current page
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, index, array) => {
                // Add ellipsis between non-consecutive pages
                if (index > 0 && array[index] - array[index - 1] > 1) {
                  return (
                    <React.Fragment key={`ellipsis-${page}`}>
                      <PaginationItem key={`ellipsis-before-${page}`}>
                        <span className="flex h-9 w-9 items-center justify-center">
                          ...
                        </span>
                      </PaginationItem>
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  );
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}

      {totalExercises > 0 && totalExercises < 5 && activeTab !== "all" && (
        <div className="mt-8 bg-muted p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Need more exercises?</h3>
          <p className="text-muted-foreground mb-4">
            Generate more exercises for this body part and expand your library.
          </p>
          {user ? (
            <Button onClick={() => handleGenerateExercises(activeTab, "", 3)}>
              Generate More{" "}
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Exercises
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")}>
              Log in to generate exercises
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

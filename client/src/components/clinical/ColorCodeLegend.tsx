import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Stethoscope, 
  Activity, 
  AlertTriangle, 
  BookOpen, 
  GraduationCap, 
  AlertCircle,
  Info,
  X
} from 'lucide-react';

const legendItems = [
  {
    type: 'assessment',
    label: 'Assessment & Evaluation',
    description: 'Physical examination, tests, measurements, and clinical observations',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    iconComponent: Stethoscope
  },
  {
    type: 'treatment',
    label: 'Treatment & Interventions',
    description: 'Exercise prescriptions, manual therapy, protocols, and rehabilitation programs',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    iconComponent: Activity
  },
  {
    type: 'differential',
    label: 'Differential Diagnosis',
    description: 'Possible conditions, diagnostic reasoning, and clinical decision pathways',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    iconComponent: AlertTriangle
  },
  {
    type: 'evidence',
    label: 'Evidence & Research',
    description: 'Research citations, evidence grades, study findings, and clinical guidelines',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    iconComponent: BookOpen
  },
  {
    type: 'education',
    label: 'Patient Education',
    description: 'Condition explanations, prognosis, self-management, and prevention advice',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: 'text-teal-600',
    iconComponent: GraduationCap
  },
  {
    type: 'precautions',
    label: 'Precautions & Red Flags',
    description: 'Safety warnings, contraindications, risks, and when to refer',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    iconComponent: AlertCircle
  }
];

interface ColorCodeLegendProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function ColorCodeLegend({ isVisible, onToggle }: ColorCodeLegendProps) {
  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="mb-3 text-xs"
      >
        <Info className="h-3 w-3 mr-1" />
        Color Guide
      </Button>
    );
  }

  return (
    <Card className="mb-4 bg-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Content Color Guide
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {legendItems.map((item) => {
            const IconComponent = item.iconComponent;
            return (
              <div
                key={item.type}
                className={`${item.bg} ${item.border} border rounded-lg p-2`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent className={`h-3 w-3 ${item.icon}`} />
                  <span className="text-xs font-medium text-gray-900">
                    {item.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ProductionPlaceholderProps {
  feature: string;
  description?: string;
}

export const ProductionPlaceholder: React.FC<ProductionPlaceholderProps> = ({ 
  feature, 
  description = "This advanced feature requires additional resources to load." 
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{feature}</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {description}
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              This feature is optimized for development mode. In production, it loads on-demand to improve performance.
            </span>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
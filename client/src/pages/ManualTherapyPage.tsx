import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/use-auth';
import ManualTherapyList from '@/components/manualTherapy/ManualTherapyList';
import TechniqueForm from '@/components/manualTherapy/TechniqueForm';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter
} from '@/components/ui/sheet';

export default function ManualTherapyPage() {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>Manual Therapy Techniques | PhysioConversation</title>
        <meta name="description" content="Browse evidence-based manual therapy techniques organized by body part for physiotherapists." />
      </Helmet>
      <main className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manual Therapy Techniques</h1>
            <p className="text-muted-foreground mt-1">
              Evidence-based manual therapy techniques for physiotherapists
            </p>
          </div>
          
          {user && (
            <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
              <SheetTrigger asChild>
                <Button className="mt-4 md:mt-0">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Technique
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full md:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Add New Manual Therapy Technique</SheetTitle>
                  <SheetDescription>
                    Add a new evidence-based manual therapy technique to the library.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <TechniqueForm />
                </div>
                <SheetFooter className="pt-2">
                  <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </div>
        
        <ManualTherapyList />
      </main>
    </>
  );
}
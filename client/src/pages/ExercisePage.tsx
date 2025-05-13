import React from 'react';
import { Helmet } from 'react-helmet';
import ExerciseList from '@/components/exercises/ExerciseList';

export default function ExercisePage() {
  return (
    <>
      <Helmet>
        <title>Exercise Library | PhysioConversation</title>
        <meta name="description" content="Browse and generate evidence-based exercises for various body parts and difficulty levels. Personalize your rehabilitation program with our AI-powered exercise library." />
        <meta property="og:title" content="Exercise Library | PhysioConversation" />
        <meta property="og:description" content="Browse and generate evidence-based exercises for various body parts and difficulty levels." />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <ExerciseList />
      </div>
    </>
  );
}
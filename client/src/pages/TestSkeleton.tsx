import RiggedAnatomicalSkeleton from "@/components/3d/RiggedAnatomicalSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestSkeleton() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">3D Anatomical Skeleton Test - Artec 3D Model</h1>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Rigged Skeleton from Artec 3D</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[700px] bg-gray-100 rounded-lg overflow-hidden">
            <RiggedAnatomicalSkeleton 
              patientData={{
                anthropometrics: {
                  height: 170,
                  weight: 70,
                  limbLengths: {
                    upperArm: 30,
                    forearm: 25,
                    thigh: 40,
                    shin: 35,
                  },
                },
                jointRestrictions: {},
                painAreas: [],
                movementPatterns: null
              }}
              className="w-full h-full"
              showControls={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
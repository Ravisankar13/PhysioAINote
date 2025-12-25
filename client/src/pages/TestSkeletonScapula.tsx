import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ExternalLink, RotateCcw } from "lucide-react";
import ScapulaSkeletonViewer from "@/components/skeleton/ScapulaSkeletonViewer";

const AVAILABLE_MODELS = [
  { id: "skeleton_character", name: "Current Model (44 bones)", path: "/models/skeleton_character.glb" },
  { id: "skeleton", name: "Skeleton (2.1MB)", path: "/models/skeleton.glb" },
  { id: "anatomical", name: "Anatomical Skeleton (98KB)", path: "/models/anatomical-skeleton.glb" },
  { id: "rigged", name: "Rigged Skeleton (50KB)", path: "/models/rigged-skeleton.glb" },
];

export default function TestSkeletonScapula() {
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[1].path);
  const [boneList, setBoneList] = useState<string[]>([]);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [selectedBone, setSelectedBone] = useState<string>("");

  const handleBonesLoaded = (bones: string[]) => {
    setBoneList(bones);
    console.log("Loaded bones:", bones);
  };

  const handleSliderChange = (boneName: string, axis: string, value: number) => {
    const key = `${boneName}_${axis}`;
    setSliderValues(prev => ({ ...prev, [key]: value }));
  };

  const resetSliders = () => {
    setSliderValues({});
  };

  const scapulaRelatedBones = boneList.filter(name => 
    name.toLowerCase().includes("scapula") ||
    name.toLowerCase().includes("scap") ||
    name.toLowerCase().includes("shoulder") ||
    name.toLowerCase().includes("clavicle") ||
    name.toLowerCase().includes("clav")
  );

  const hasScapula = scapulaRelatedBones.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="bg-amber-500/90 text-black px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
        <div>
          <strong>Scapula Model Explorer</strong> - Testing different skeleton models for scapula bones
        </div>
        <a
          href={window.location.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in New Tab (for WebGL)
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Model Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.path}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-300">
                <strong>Total Bones:</strong> {boneList.length}
              </p>
              {hasScapula ? (
                <p className="text-sm text-green-400 mt-2">
                  ✓ Scapula-related bones found: {scapulaRelatedBones.length}
                </p>
              ) : (
                <p className="text-sm text-red-400 mt-2">
                  ✗ No scapula bones found
                </p>
              )}
            </div>

            {scapulaRelatedBones.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">Scapula Bones:</p>
                {scapulaRelatedBones.map(bone => (
                  <div key={bone} className="text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded">
                    {bone}
                  </div>
                ))}
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetSliders}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">3D Viewer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] bg-slate-900 rounded-lg overflow-hidden">
              <ScapulaSkeletonViewer
                modelPath={selectedModel}
                onBonesLoaded={handleBonesLoaded}
                sliderValues={sliderValues}
                selectedBone={selectedBone}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-slate-800/50 border-slate-700 max-h-[700px] overflow-auto">
          <CardHeader>
            <CardTitle className="text-white text-lg">Bone Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {boneList.length === 0 ? (
                <p className="text-slate-400 text-sm">Loading bones...</p>
              ) : (
                boneList.map(bone => {
                  const isScapulaRelated = scapulaRelatedBones.includes(bone);
                  return (
                    <button
                      key={bone}
                      onClick={() => setSelectedBone(bone)}
                      className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                        selectedBone === bone
                          ? "bg-blue-600 text-white"
                          : isScapulaRelated
                          ? "bg-green-900/50 text-green-300 hover:bg-green-800/50"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {bone}
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedBone && (
        <Card className="mt-4 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Control: {selectedBone}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["X", "Y", "Z"].map(axis => (
                <div key={axis} className="space-y-2">
                  <label className="text-sm text-slate-300">
                    Rotation {axis}: {(sliderValues[`${selectedBone}_${axis}`] || 0).toFixed(0)}°
                  </label>
                  <Slider
                    value={[sliderValues[`${selectedBone}_${axis}`] || 0]}
                    onValueChange={([v]) => handleSliderChange(selectedBone, axis, v)}
                    min={-90}
                    max={90}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

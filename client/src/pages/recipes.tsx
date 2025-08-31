
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Recipe from "@/components/recipe";
import { useToast } from "@/hooks/use-toast";

export default function Recipes() {
  const { toast } = useToast();

  const handleSaveProduct = (productData: any) => {
    console.log("Recipe saved:", productData);
    toast({
      title: "Success",
      description: "Recipe saved successfully",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
          <p className="text-muted-foreground">
            Create and manage product recipes with cost calculations
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recipe Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <Recipe onSave={handleSaveProduct} />
        </CardContent>
      </Card>
    </div>
  );
}

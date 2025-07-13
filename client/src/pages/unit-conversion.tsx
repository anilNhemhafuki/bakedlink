import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Calculator, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SearchBar from "@/components/search-bar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Unit, UnitConversion } from "@shared/schema";

export default function UnitConversion() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConversion, setEditingConversion] =
    useState<UnitConversion | null>(null);
  const [fromUnit, setFromUnit] = useState("");
  const [toUnit, setToUnit] = useState("");
  const [conversionFactor, setConversionFactor] = useState("");
  const [formula, setFormula] = useState("");

  // Unit conversion calculator states
  const [calcFromUnit, setCalcFromUnit] = useState("");
  const [calcToUnit, setCalcToUnit] = useState("");
  const [calcAmount, setCalcAmount] = useState("");
  const [calcResult, setCalcResult] = useState("");

  const { toast } = useToast();

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: conversions = [], isLoading: conversionsLoading } = useQuery({
    queryKey: ["/api/unit-conversions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/unit-conversions", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit conversion created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/unit-conversions"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest(
        `/api/unit-conversions/${editingConversion?.id}`,
        "PUT",
        data,
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit conversion updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/unit-conversions"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/unit-conversions/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit conversion deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/unit-conversions"] });
    },
  });

  const resetForm = () => {
    setFromUnit("");
    setToUnit("");
    setConversionFactor("");
    setFormula("");
    setEditingConversion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromUnit || !toUnit || !conversionFactor) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const data = {
      fromUnitId: parseInt(fromUnit),
      toUnitId: parseInt(toUnit),
      conversionFactor: parseFloat(conversionFactor),
      formula: formula || null,
    };

    if (editingConversion) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (conversion: UnitConversion) => {
    setEditingConversion(conversion);
    setFromUnit(conversion.fromUnitId.toString());
    setToUnit(conversion.toUnitId.toString());
    setConversionFactor(conversion.conversionFactor.toString());
    setFormula(conversion.formula || "");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this conversion?")) {
      deleteMutation.mutate(id);
    }
  };

  const calculateConversion = () => {
    if (!calcFromUnit || !calcToUnit || !calcAmount) {
      toast({
        title: "Error",
        description: "Please fill in all calculation fields",
        variant: "destructive",
      });
      return;
    }

    const conversion = conversions.find(
      (c: any) =>
        c.fromUnitId === parseInt(calcFromUnit) &&
        c.toUnitId === parseInt(calcToUnit),
    );

    if (conversion) {
      const result =
        parseFloat(calcAmount) * parseFloat(conversion.conversionFactor);
      setCalcResult(result.toFixed(4));
    } else {
      // Try reverse conversion
      const reverseConversion = conversions.find(
        (c: any) =>
          c.fromUnitId === parseInt(calcToUnit) &&
          c.toUnitId === parseInt(calcFromUnit),
      );

      if (reverseConversion) {
        const result =
          parseFloat(calcAmount) /
          parseFloat(reverseConversion.conversionFactor);
        setCalcResult(result.toFixed(4));
      } else {
        toast({
          title: "Error",
          description: "No conversion found between these units",
          variant: "destructive",
        });
      }
    }
  };

  const getUnitName = (unitId: number) => {
    const unit = units.find((u: Unit) => u.id === unitId);
    return unit ? `${unit.name} (${unit.abbreviation})` : "Unknown";
  };

  const filteredConversions = conversions.filter((conversion: any) => {
    const fromUnitName = getUnitName(conversion.fromUnitId);
    const toUnitName = getUnitName(conversion.toUnitId);
    return (
      fromUnitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toUnitName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Conversion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConversion ? "Edit Conversion" : "Add New Conversion"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromUnit">From Unit</Label>
                  <Select value={fromUnit} onValueChange={setFromUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(units) && units.filter((unit: Unit) => unit.isActive).map((unit: Unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="toUnit">To Unit</Label>
                  <Select value={toUnit} onValueChange={setToUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(units) && units.filter((unit: Unit) => unit.isActive).map((unit: Unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="conversionFactor">Conversion Factor</Label>
                <Input
                  id="conversionFactor"
                  type="number"
                  step="0.000001"
                  placeholder="e.g., 1000 (1 kg = 1000 g)"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="formula">Formula (Optional)</Label>
                <Input
                  id="formula"
                  placeholder="e.g., value * 1000"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingConversion
                      ? "Update"
                      : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unit Conversion Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Unit Converter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label htmlFor="calcAmount">Amount</Label>
              <Input
                id="calcAmount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="calcFromUnit">From Unit</Label>
              <Select value={calcFromUnit} onValueChange={setCalcFromUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(units) && units.filter((unit: Unit) => unit.isActive).map((unit: Unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name} ({unit.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="calcToUnit">To Unit</Label>
              <Select value={calcToUnit} onValueChange={setCalcToUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(units) && units.filter((unit: Unit) => unit.isActive).map((unit: Unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name} ({unit.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={calculateConversion} className="w-full">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Convert
            </Button>
          </div>
          {calcResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-lg font-semibold">
                Result: {calcResult}{" "}
                {getUnitName(parseInt(calcToUnit)).split(" ")[0]}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <SearchBar
            placeholder="Search conversions..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full"
          />
        </div>
      </div>

      {/* Conversions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          {conversionsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">
                Loading conversions...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Unit</TableHead>
                    <TableHead>To Unit</TableHead>
                    <TableHead>Conversion Factor</TableHead>
                    <TableHead>Formula</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversions.map((conversion: any) => (
                    <TableRow key={conversion.id}>
                      <TableCell className="font-medium">
                        {getUnitName(conversion.fromUnitId)}
                      </TableCell>
                      <TableCell>{getUnitName(conversion.toUnitId)}</TableCell>
                      <TableCell>{conversion.conversionFactor}</TableCell>
                      <TableCell>{conversion.formula || "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            conversion.isActive ? "default" : "secondary"
                          }
                        >
                          {conversion.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(conversion)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(conversion.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
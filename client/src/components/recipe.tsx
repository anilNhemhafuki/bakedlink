import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { useUnits } from "@/hooks/useUnits";
import { Trash2, Plus, Calculator, Save, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const recipeSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  categoryId: z.string().optional(),
  unitId: z.string().min(1, "Unit is required"),
  batchSize: z.string().min(1, "Batch size is required").default("1"),
  finishedGoodRequired: z
    .string()
    .min(1, "FG required is required")
    .default("1"),
  productionQuantity: z
    .string()
    .min(1, "Production quantity is required")
    .default("1"),
  normalLossMfg: z.string().default("5"),
  normalLossOnSold: z.string().default("0"),
  mfgAndPackagingCost: z.string().default("45"),
  overheadCost: z.string().default("5"),
  ingredients: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1, "Ingredient is required"),
        quantity: z.string().min(1, "Quantity is required"),
        unitId: z.string().min(1, "Unit is required"),
      }),
    )
    .min(1, "At least one ingredient is required"),
});

interface RecipeProps {
  product?: any;
  onSave?: (productData: any) => void;
}

export default function Recipe({ product, onSave }: RecipeProps) {
  const [calculations, setCalculations] = useState({
    ingredientDetails: [] as any[],
    subTotalForBatch: 0,
    totalForProduction: 0,
    totalForProductionGm: 0,
    effectiveUnits: 0,
    rmCostPerUnit: 0,
    noOfFgToBeProduced: 0,
    normalLossDuringMFG: 0,
    normalLossOnSoldValue: 0,
    effectiveUnitsProduced: 0,
    estimatedCostPerUnit: 0,
    mfgCostPerUnit: 0,
    overheadCostPerUnit: 0,
    finalCostPerUnit: 0,
  });

  const { formatCurrency } = useCurrency();

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: units = [] } = useUnits();

  const form = useForm({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      productName: product?.name || "",
      categoryId: product?.categoryId?.toString() || "",
      unitId: product?.unitId?.toString() || "",
      batchSize: product?.batchSize?.toString() || "1",
      finishedGoodRequired: "1",
      productionQuantity: "1",
      normalLossMfg: "5",
      normalLossOnSold: "0",
      mfgAndPackagingCost: "45",
      overheadCost: "5",
      ingredients:
        product?.ingredients?.length > 0
          ? product.ingredients.map((ing: any) => ({
              inventoryItemId: ing.inventoryItemId?.toString() || "",
              quantity: ing.quantity?.toString() || "",
              unitId: ing.unitId?.toString() || "",
            }))
          : [{ inventoryItemId: "", quantity: "", unitId: "" }],
    },
  });

  // Filter items that are suitable as ingredients
  const ingredients = Array.isArray(inventoryItems)
    ? (inventoryItems as any[]).filter(
        (item: any) =>
          item?.name &&
          (item.group === "raw-materials" ||
            item.group === "ingredients" ||
            item.group === "flour" ||
            item.group === "dairy" ||
            item.group === "sweeteners" ||
            item.group === "spices" ||
            item.group === "leavening" ||
            item.group === "extracts" ||
            item.group === "chocolate" ||
            item.group === "nuts" ||
            item.group === "fruits" ||
            !item.group ||
            item.name.toLowerCase().includes("flour") ||
            item.name.toLowerCase().includes("sugar") ||
            item.name.toLowerCase().includes("butter") ||
            item.name.toLowerCase().includes("milk") ||
            item.name.toLowerCase().includes("egg") ||
            item.name.toLowerCase().includes("chocolate") ||
            item.name.toLowerCase().includes("vanilla") ||
            item.name.toLowerCase().includes("salt") ||
            item.name.toLowerCase().includes("baking")),
      )
    : [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const calculateCosts = () => {
    try {
      const formIngredients = form.getValues("ingredients");
      const batchSize = parseFloat(form.getValues("batchSize") || "1");
      const finishedGoodRequired = parseFloat(
        form.getValues("finishedGoodRequired") || "1",
      );
      const productionQuantity = parseFloat(
        form.getValues("productionQuantity") || "1",
      );
      const normalLossMfg = parseFloat(form.getValues("normalLossMfg") || "5");
      const normalLossOnSold = parseFloat(
        form.getValues("normalLossOnSold") || "0",
      );
      const mfgAndPackagingCost = parseFloat(
        form.getValues("mfgAndPackagingCost") || "45",
      );
      const overheadCost = parseFloat(form.getValues("overheadCost") || "5");

      // Calculate ingredient details with improved error handling
      const ingredientDetails = formIngredients
        .map((ingredient, index) => {
          try {
            const item = ingredients.find(
              (inv: any) => inv.id?.toString() === ingredient.inventoryItemId,
            );
            if (item && ingredient.quantity && ingredient.unitId) {
              const quantity = parseFloat(ingredient.quantity);
              const selectedUnit = Array.isArray(units)
                ? units.find((u: any) => u.id?.toString() === ingredient.unitId)
                : null;
              const unitAbbr =
                selectedUnit?.abbreviation || item.unit || "unit";

              // Get the inventory item's storage unit details
              const inventoryUnit = Array.isArray(units)
                ? units.find((u: any) => u.id === item.unitId)
                : null;
              const inventoryUnitAbbr =
                inventoryUnit?.abbreviation || item.unit || "unit";

              // Calculate proper price per selected unit with improved conversion
              let pricePerSelectedUnit = parseFloat(item.costPerUnit || "0");
              let amount = quantity * pricePerSelectedUnit;

              // Handle unit conversion for cost calculation
              if (
                inventoryUnitAbbr.toLowerCase() === "bag" &&
                unitAbbr.toLowerCase() !== "bag"
              ) {
                const bagToKgConversion = item.conversionRate
                  ? parseFloat(item.conversionRate)
                  : 50;
                const pricePerKg = pricePerSelectedUnit / bagToKgConversion;

                if (unitAbbr.toLowerCase() === "kg") {
                  pricePerSelectedUnit = pricePerKg;
                  amount = quantity * pricePerSelectedUnit;
                } else if (
                  unitAbbr.toLowerCase() === "g" ||
                  unitAbbr.toLowerCase() === "gm"
                ) {
                  pricePerSelectedUnit = pricePerKg / 1000;
                  amount = quantity * pricePerSelectedUnit;
                }
              } else if (
                inventoryUnitAbbr.toLowerCase() === "kg" &&
                unitAbbr.toLowerCase() === "g"
              ) {
                pricePerSelectedUnit = pricePerSelectedUnit / 1000;
                amount = quantity * pricePerSelectedUnit;
              } else if (
                inventoryUnitAbbr.toLowerCase() === "g" &&
                unitAbbr.toLowerCase() === "kg"
              ) {
                pricePerSelectedUnit = pricePerSelectedUnit * 1000;
                amount = quantity * pricePerSelectedUnit;
              }

              return {
                sn: index + 1,
                particular: item.name,
                qty: quantity,
                unit: unitAbbr,
                price: pricePerSelectedUnit,
                unitType: `Per ${unitAbbr}`,
                amount: amount,
              };
            }
            return null;
          } catch (error) {
            console.error("Error calculating ingredient:", error);
            return null;
          }
        })
        .filter(Boolean);

      // Sub-total for batch
      const subTotalForBatch = ingredientDetails.reduce(
        (sum, item) => sum + (item?.amount || 0),
        0,
      );

      // Scale factor for production
      const scaleFactor = productionQuantity / batchSize;
      const totalForProduction = subTotalForBatch * scaleFactor;

      // Total weight in grams with improved conversion
      const totalForProductionGm = ingredientDetails.reduce((sum, item) => {
        if (!item) return sum;

        let qtyInGrams = item.qty;

        switch (item.unit.toLowerCase()) {
          case "kg":
            qtyInGrams = item.qty * 1000;
            break;
          case "g":
          case "gm":
          case "grams":
            qtyInGrams = item.qty;
            break;
          case "ml":
          case "milliliters":
            qtyInGrams = item.qty;
            break;
          case "l":
          case "ltr":
          case "liters":
            qtyInGrams = item.qty * 1000;
            break;
          case "bag":
            qtyInGrams = item.qty * 50000;
            break;
          default:
            qtyInGrams = item.qty;
        }

        return sum + qtyInGrams * scaleFactor;
      }, 0);

      // No. of FG to be produced
      const noOfFgToBeProduced =
        finishedGoodRequired > 0
          ? totalForProductionGm / finishedGoodRequired
          : 0;

      // Loss values in units
      const normalLossDuringMFG = noOfFgToBeProduced * (normalLossMfg / 100);
      const normalLossOnSoldValue =
        noOfFgToBeProduced * (normalLossOnSold / 100);

      // Effective units produced after losses
      const effectiveUnitsProduced =
        noOfFgToBeProduced - normalLossDuringMFG - normalLossOnSoldValue;

      // Cost per unit calculations
      const estimatedCostPerUnit =
        effectiveUnitsProduced > 0
          ? subTotalForBatch / effectiveUnitsProduced
          : 0;
      const mfgCostPerUnit = estimatedCostPerUnit * (mfgAndPackagingCost / 100);
      const overheadCostPerUnit = estimatedCostPerUnit * (overheadCost / 100);
      const finalCostPerUnit =
        estimatedCostPerUnit + mfgCostPerUnit + overheadCostPerUnit;

      setCalculations({
        ingredientDetails,
        subTotalForBatch,
        totalForProduction,
        totalForProductionGm,
        effectiveUnits: totalForProductionGm,
        rmCostPerUnit: finishedGoodRequired * 350,
        noOfFgToBeProduced,
        normalLossDuringMFG,
        normalLossOnSoldValue,
        effectiveUnitsProduced,
        estimatedCostPerUnit,
        mfgCostPerUnit,
        overheadCostPerUnit,
        finalCostPerUnit,
      });
    } catch (error) {
      console.error("Error in cost calculation:", error);
    }
  };

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      form.reset({
        productName: product.name || "",
        categoryId: product.categoryId?.toString() || "",
        unitId: product.unitId?.toString() || "",
        batchSize: product.batchSize?.toString() || "1",
        finishedGoodRequired: "1",
        productionQuantity: "1",
        normalLossMfg: "5",
        normalLossOnSold: "0",
        mfgAndPackagingCost: "45",
        overheadCost: "5",
        ingredients:
          product.ingredients?.length > 0
            ? product.ingredients.map((ing: any) => ({
                inventoryItemId: ing.inventoryItemId?.toString() || "",
                quantity: ing.quantity?.toString() || "",
                unitId: ing.unitId?.toString() || "",
              }))
            : [{ inventoryItemId: "", quantity: "", unitId: "" }],
      });
    }
  }, [product, form]);

  useEffect(() => {
    calculateCosts();
  }, [form.watch()]);

  const handleSaveProduct = () => {
    try {
      const formData = form.getValues();
      const productData = {
        name: formData.productName,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        price: calculations.finalCostPerUnit,
        cost: calculations.estimatedCostPerUnit,
        batchSize: parseFloat(formData.batchSize),
        ingredients: formData.ingredients.map((ing) => ({
          inventoryItemId: parseInt(ing.inventoryItemId),
          quantity: parseFloat(ing.quantity),
          unitId: parseInt(ing.unitId),
        })),
      };

      onSave?.(productData);
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form className="space-y-8">
          {/* Product Information */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Recipe Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Product Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Artisan Bread"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Product Unit
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(units) &&
                            units
                              .filter((unit: any) => unit.isActive)
                              .map((unit: any) => (
                                <SelectItem
                                  key={unit.id}
                                  value={unit.id.toString()}
                                >
                                  {unit.name} ({unit.abbreviation})
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ingredients - Enhanced Table */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Recipe Ingredients
                </CardTitle>
                <Badge variant="outline" className="bg-white">
                  {fields.length} ingredient{fields.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-full bg-white rounded-lg">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b font-semibold text-sm text-gray-700">
                    <div className="col-span-1 text-center">S.N</div>
                    <div className="col-span-4">Ingredient Name</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-3">Unit</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-100">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors"
                      >
                        {/* Serial Number */}
                        <div className="col-span-1 flex items-center justify-center">
                          <Badge
                            variant="secondary"
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                          >
                            {index + 1}
                          </Badge>
                        </div>

                        {/* Ingredient Select */}
                        <div className="col-span-4">
                          <FormField
                            control={form.control}
                            name={`ingredients.${index}.inventoryItemId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="Select ingredient" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ingredients.map((item: any) => (
                                      <SelectItem
                                        key={item.id}
                                        value={item.id.toString()}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {item.name}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {formatCurrency(item.costPerUnit)}/
                                            {item.unit}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Quantity Input */}
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`ingredients.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Unit Select */}
                        <div className="col-span-3">
                          <FormField
                            control={form.control}
                            name={`ingredients.${index}.unitId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.isArray(units) &&
                                      units
                                        .filter((unit: any) => unit.isActive)
                                        .map((unit: any) => (
                                          <SelectItem
                                            key={unit.id}
                                            value={unit.id.toString()}
                                          >
                                            {unit.name} ({unit.abbreviation})
                                          </SelectItem>
                                        ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Ingredient Button */}
                  <div className="p-4 border-t bg-gray-50/50">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        append({
                          inventoryItemId: "",
                          quantity: "",
                          unitId: "",
                        })
                      }
                      className="w-full h-11 border-dashed border-2 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Ingredient
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Parameters */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-purple-600" />
                Production Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="batchSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Batch Size (kg)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="finishedGoodRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        1 unit FG required (Gm RM)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="normalLossMfg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Normal Loss during mfg. (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="normalLossOnSold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Normal Loss on sold FG (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mfgAndPackagingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Mfg. and packaging cost (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overheadCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Overhead cost (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Enhanced Cost Breakdown */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-orange-600" />
            {product ? "Edit Recipe" : "Recipe"}:{" "}
            {form.getValues("productName") || "Untitled Recipe"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Computation of Total Cost */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Computation of Total Cost
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      S.N
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Particulars
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Qty.
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {calculations.ingredientDetails.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-center">
                        {item.sn}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.particular}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.qty?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge variant="outline">{item.unit}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {item.unitType}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                    <td className="px-4 py-3 text-sm font-bold text-center">
                      A.
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">
                      Total for {form.getValues("batchSize")} kg
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {calculations.totalForProductionGm.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="secondary">gm</Badge>
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                      {formatCurrency(calculations.subTotalForBatch ?? 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Computation of Effective Unit */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Computation of Effective Unit
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full bg-white">
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm w-12">1</td>
                    <td className="px-4 py-3 text-sm">
                      Total for {form.getValues("batchSize")} kg
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right font-medium"
                      colSpan={4}
                    >
                      {calculations.totalForProductionGm.toFixed(1)} gm
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">2</td>
                    <td className="px-4 py-3 text-sm">
                      1 unit FG required ..... Gm RM
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right font-medium"
                      colSpan={4}
                    >
                      {form.getValues("finishedGoodRequired")} gm
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">3</td>
                    <td className="px-4 py-3 text-sm">
                      No. of FG to be Produced
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right font-medium"
                      colSpan={4}
                    >
                      {calculations.noOfFgToBeProduced.toFixed(2)} pcs
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">4</td>
                    <td className="px-4 py-3 text-sm">
                      Less: Normal Loss during mfg.
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {form.getValues("normalLossMfg")}%
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right font-medium"
                      colSpan={3}
                    >
                      {calculations.normalLossDuringMFG.toFixed(2)} pcs
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">5</td>
                    <td className="px-4 py-3 text-sm">
                      Less: Normal Loss on sold FG
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {form.getValues("normalLossOnSold")}%
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right font-medium"
                      colSpan={3}
                    >
                      {calculations.normalLossOnSoldValue.toFixed(2)} pcs
                    </td>
                  </tr>
                  <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                    <td className="px-4 py-3 text-sm font-bold">B.</td>
                    <td className="px-4 py-3 text-sm font-bold">
                      Effective No. of FG produced
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right font-bold text-green-700"
                      colSpan={4}
                    >
                      {calculations.effectiveUnitsProduced.toFixed(2)} pcs
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost per unit And selling price per unit */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Cost per unit And selling price per unit
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full bg-white">
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm w-12">I</td>
                    <td className="px-4 py-3 text-sm">
                      Estimated Cost per unit
                    </td>
                    <td className="px-4 py-3 text-sm text-center">A / B</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(calculations.estimatedCostPerUnit)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">II</td>
                    <td className="px-4 py-3 text-sm">
                      Mfg. and packaging cost per unit
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {form.getValues("mfgAndPackagingCost")}%
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(calculations.mfgCostPerUnit)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">III</td>
                    <td className="px-4 py-3 text-sm">
                      Overhead cost per unit
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {form.getValues("overheadCost")}%
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(calculations.overheadCostPerUnit)}
                    </td>
                  </tr>
                  <tr className="bg-green-50 border-t-2 border-green-200">
                    <td className="px-4 py-3 text-sm font-bold"></td>
                    <td className="px-4 py-3 text-sm font-bold">
                      Cost per unit
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium">
                      I + II + III
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-2xl text-green-700">
                      {formatCurrency(calculations.finalCostPerUnit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={calculateCosts} className="h-11">
          <Calculator className="h-4 w-4 mr-2" />
          Recalculate
        </Button>
        <Button
          onClick={handleSaveProduct}
          disabled={!form.getValues("productName")}
          className="h-11"
        >
          <Save className="h-4 w-4 mr-2" />
          {product ? "Update Recipe" : "Save as Product"}
        </Button>
      </div>
    </div>
  );
}

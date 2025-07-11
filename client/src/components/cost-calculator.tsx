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

const costCalculatorSchema = z.object({
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
      }),
    )
    .min(1, "At least one ingredient is required"),
});

interface CostCalculatorProps {
  onSave?: (productData: any) => void;
}

export default function CostCalculator({ onSave }: CostCalculatorProps) {
  const [calculations, setCalculations] = useState({
    ingredientDetails: [] as any[],
    subTotalForBatch: 0,
    totalForProduction: 0,
    totalForProductionGm: 0,
    effectiveUnits: 0,
    rmCostPerUnit: 0,
    effectiveUnitsProduced: 0,
    estimatedCostPerUnit: 0,
    mfgCostPerUnit: 0,
    overheadCostPerUnit: 0,
    finalCostPerUnit: 0,
  });

  const { formatCurrency } = useCurrency();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Filter items that are suitable as ingredients
  const ingredients = (inventoryItems as any[]).filter((item: any) => 
    item.name && (
      item.group === 'raw-materials' || 
      item.group === 'ingredients' || 
      item.group === 'flour' ||
      item.group === 'dairy' ||
      item.group === 'sweeteners' ||
      item.group === 'spices' ||
      item.group === 'leavening' ||
      item.group === 'extracts' ||
      item.group === 'chocolate' ||
      item.group === 'nuts' ||
      item.group === 'fruits' ||
      !item.group || 
      item.name.toLowerCase().includes('flour') ||
      item.name.toLowerCase().includes('sugar') ||
      item.name.toLowerCase().includes('butter') ||
      item.name.toLowerCase().includes('milk') ||
      item.name.toLowerCase().includes('egg') ||
      item.name.toLowerCase().includes('chocolate') ||
      item.name.toLowerCase().includes('vanilla') ||
      item.name.toLowerCase().includes('salt') ||
      item.name.toLowerCase().includes('baking')
    )
  );

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const form = useForm({
    resolver: zodResolver(costCalculatorSchema),
    defaultValues: {
      productName: "",
      categoryId: "",
      batchSize: "1",
      finishedGoodRequired: "1",
      productionQuantity: "1",
      normalLossMfg: "5",
      normalLossOnSold: "0",
      mfgAndPackagingCost: "45",
      overheadCost: "5",
      ingredients: [{ inventoryItemId: "", quantity: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const calculateCosts = () => {
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

    // Calculate ingredient details
    const ingredientDetails = formIngredients
      .map((ingredient, index) => {
        const item = ingredients.find(
          (inv: any) => inv.id.toString() === ingredient.inventoryItemId,
        );
        if (item && ingredient.quantity) {
          const quantity = parseFloat(ingredient.quantity);
          const pricePerUnit = parseFloat(item.costPerUnit);
          const amount = quantity * pricePerUnit;

          return {
            sn: index + 1,
            particular: item.name,
            qty: quantity,
            unit:
              units.find((u: any) => u.id === item.unitId)?.abbreviation ||
              item.unit,
            price: pricePerUnit,
            unitType: `Per ${units.find((u: any) => u.id === item.unitId)?.abbreviation || item.unit}`,
            amount: amount,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Calculate sub-total for batch
    const subTotalForBatch = ingredientDetails.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // Calculate total for production (scaling up)
    const scaleFactor = productionQuantity / batchSize;
    const totalForProduction = subTotalForBatch * scaleFactor;

    // Calculate total weight in grams
    const totalForProductionGm = ingredientDetails.reduce((sum, item) => {
      const qtyInGrams =
        item.unit === "kg"
          ? item.qty * 1000
          : item.unit === "ml"
            ? item.qty
            : item.qty;
      return sum + qtyInGrams * scaleFactor;
    }, 0);

    // Calculate effective units
    const effectiveUnits = totalForProductionGm;
    const rmCostPerUnit = finishedGoodRequired * 350; // Assuming 350 is RM cost

    // Calculate production with losses
    const lossFactorMfg = (100 - normalLossMfg) / 100;
    const lossFactorSold = (100 - normalLossOnSold) / 100;
    const effectiveUnitsProduced =
      productionQuantity * lossFactorMfg * lossFactorSold;

    // Calculate costs per unit
    const estimatedCostPerUnit = totalForProduction / effectiveUnitsProduced;
    const mfgCostPerUnit = estimatedCostPerUnit * (mfgAndPackagingCost / 100);
    const overheadCostPerUnit = estimatedCostPerUnit * (overheadCost / 100);
    const finalCostPerUnit =
      estimatedCostPerUnit + mfgCostPerUnit + overheadCostPerUnit;

    setCalculations({
      ingredientDetails,
      subTotalForBatch,
      totalForProduction,
      totalForProductionGm,
      effectiveUnits,
      rmCostPerUnit,
      effectiveUnitsProduced,
      estimatedCostPerUnit,
      mfgCostPerUnit,
      overheadCostPerUnit,
      finalCostPerUnit,
    });
  };

  useEffect(() => {
    calculateCosts();
  }, [form.watch()]);

  const handleSaveProduct = () => {
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
      })),
    };

    onSave?.(productData);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Bread" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category: any) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batchSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Size (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recipe Ingredients</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                >
                  {/* Ingredient Select */}
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.inventoryItemId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ingredient</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ingredients.map((item: any) => (
                              <SelectItem
                                key={item.id}
                                value={item.id.toString()}
                              >
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quantity Input */}
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Unit Select */}
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.unitId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit: any) => (
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

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      inventoryItemId: "",
                      quantity: "",
                      unitId: "",
                    })
                  }
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Ingredient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Production Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Production Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="finishedGoodRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>1 unit FG required (Gm RM)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productionQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. of FG to be Produced</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
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
                      <FormLabel>Normal Loss during mfg. (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
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
                      <FormLabel>Normal Loss on sold FG (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
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
                      <FormLabel>Mfg. and packaging cost (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
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
                      <FormLabel>Overhead cost (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
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

      {/* Detailed Cost Breakdown */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">
            Product: {form.getValues("productName") || "Bread"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Computation of Total Cost */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Computation of Total Cost</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1">S.N</th>
                    <th className="border border-gray-300 px-2 py-1">
                      Particulars
                    </th>
                    <th className="border border-gray-300 px-2 py-1">Qty.</th>
                    <th className="border border-gray-300 px-2 py-1">Unit</th>
                    <th className="border border-gray-300 px-2 py-1">Price</th>
                    <th className="border border-gray-300 px-2 py-1">Unit</th>
                    <th className="border border-gray-300 px-2 py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.ingredientDetails.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {item.sn}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        {item.particular}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {item.qty}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {item.unit}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {item.unitType}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-100 font-semibold">
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      A.
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      Sub-total for {form.getValues("batchSize")} kg
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {calculations.totalForProductionGm.toFixed(1)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      gm
                    </td>
                    <td className="border border-gray-300 px-2 py-1"></td>
                    <td className="border border-gray-300 px-2 py-1"></td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {formatCurrency(calculations.subTotalForBatch ?? 0)}
                    </td>
                  </tr>
                  <tr className="bg-yellow-100 font-semibold">
                    <td className="border border-gray-300 px-2 py-1"></td>
                    <td className="border border-gray-300 px-2 py-1">
                      Total for {form.getValues("productionQuantity")} kg
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {(
                        (calculations.totalForProductionGm *
                          parseFloat(form.getValues("productionQuantity"))) /
                        parseFloat(form.getValues("batchSize"))
                      ).toFixed(1)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      gm
                    </td>
                    <td className="border border-gray-300 px-2 py-1"></td>
                    <td className="border border-gray-300 px-2 py-1"></td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {formatCurrency(calculations.totalForProduction)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Computation of Effective Unit */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">
              Computation of Effective Unit
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">1</td>
                    <td className="border border-gray-300 px-2 py-1">
                      Total for {form.getValues("productionQuantity")} kg
                    </td>
                    <td
                      className="border border-gray-300 px-2 py-1 text-right"
                      colSpan={4}
                    >
                      {calculations.totalForProduction.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">2</td>
                    <td className="border border-gray-300 px-2 py-1">
                      1 unit FG required ..... Gm RM
                    </td>
                    <td
                      className="border border-gray-300 px-2 py-1 text-right"
                      colSpan={4}
                    >
                      {form.getValues("finishedGoodRequired")}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">3</td>
                    <td className="border border-gray-300 px-2 py-1">
                      No. of FG to be Produced
                    </td>
                    <td
                      className="border border-gray-300 px-2 py-1 text-right"
                      colSpan={4}
                    >
                      {parseFloat(form.getValues("productionQuantity")).toFixed(
                        2,
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">4</td>
                    <td className="border border-gray-300 px-2 py-1">
                      Less: Normal Loss during mfg.
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {form.getValues("normalLossMfg")}%
                    </td>
                    <td
                      className="border border-gray-300 px-2 py-1 text-right"
                      colSpan={3}
                    >
                      {(
                        (parseFloat(form.getValues("productionQuantity")) *
                          parseFloat(form.getValues("normalLossMfg"))) /
                        100
                      ).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">5</td>
                    <td className="border border-gray-300 px-2 py-1">
                      Less: Normal Loss on sold FG
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {form.getValues("normalLossOnSold")}%
                    </td>
                    <td
                      className="border border-gray-300 px-2 py-1 text-right"
                      colSpan={3}
                    >
                      {(
                        (parseFloat(form.getValues("productionQuantity")) *
                          parseFloat(form.getValues("normalLossOnSold"))) /
                        100
                      ).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-yellow-100 font-semibold">
                    <td className="border border-gray-300 px-2 py-1">B.</td>
                    <td className="border border-gray-300 px-2 py-1">
                      Effective No. of FG produced
                    </td>
                    <td
                      className="border border-gray-300 px-2 py-1 text-right"
                      colSpan={4}
                    >
                      {calculations.effectiveUnitsProduced.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost per unit And selling price per unit */}
          <div>
            <h3 className="font-semibold mb-3">
              Cost per unit And selling price per unit
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">I</td>
                    <td className="border border-gray-300 px-2 py-1">
                      Estimated Cost per unit
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      A/B
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {calculations.estimatedCostPerUnit.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">II</td>
                    <td className="border border-gray-300 px-2 py-1">
                      Mfg. and packaging cost per unit
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {form.getValues("mfgAndPackagingCost")}%
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {calculations.mfgCostPerUnit.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">III</td>
                    <td className="border border-gray-300 px-2 py-1">
                      Overhead cost
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {form.getValues("overheadCost")}%
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {calculations.overheadCostPerUnit.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-green-100 font-bold">
                    <td className="border border-gray-300 px-2 py-1"></td>
                    <td className="border border-gray-300 px-2 py-1">
                      Cost per unit
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      I+II
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {calculations.finalCostPerUnit.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={calculateCosts}>
          <i className="fas fa-calculator mr-2"></i>
          Recalculate
        </Button>
        <Button
          onClick={handleSaveProduct}
          disabled={!form.getValues("productName")}
        >
          <i className="fas fa-save mr-2"></i>
          Save as Product
        </Button>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import MediaLibrary from "./media-library";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { z } from "zod";

const productFormSchema = insertProductSchema.extend({
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  cost: z.string().min(1, "Cost is required"),
  margin: z.string().min(1, "Margin is required"),
  // Cost calculator fields
  batchSize: z.string().default("1"),
  finishedGoodRequired: z.string().default("1"),
  productionQuantity: z.string().default("1"),
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
    .default([]),
});

interface ProductFormProps {
  product?: any;
  onSuccess?: () => void;
}

export default function ProductFormEnhanced({
  product,
  onSuccess,
}: ProductFormProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [activeTab, setActiveTab] = useState("basic");
  const [calculations, setCalculations] = useState({
    subTotalForBatch: 0,
    totalForProduction: 0,
    effectiveUnits: 0,
    rmCostPerUnit: 0,
    effectiveUnitsProduced: 0,
    estimatedCostPerUnit: 0,
    mfgCostPerUnit: 0,
    overheadCostPerUnit: 0,
    finalCostPerUnit: 0,
  });
  const { toast } = useToast();
  const { symbol, formatCurrency } = useCurrency();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const form = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      unitId: "",
      price: "",
      cost: "",
      margin: "",
      sku: "",
      batchSize: "1",
      finishedGoodRequired: "1",
      productionQuantity: "1",
      normalLossMfg: "5",
      normalLossOnSold: "0",
      mfgAndPackagingCost: "45",
      overheadCost: "5",
      ingredients: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || "",
        description: product.description || "",
        categoryId: product.categoryId?.toString() || "",
        unitId: product.unitId?.toString() || "",
        price: product.price?.toString() || "",
        cost: product.cost?.toString() || "",
        margin: product.margin?.toString() || "",
        sku: product.sku || "",
        batchSize: "1",
        finishedGoodRequired: "1",
        productionQuantity: "1",
        normalLossMfg: "5",
        normalLossOnSold: "0",
        mfgAndPackagingCost: "45",
        overheadCost: "5",
        ingredients: [],
      });
      setSelectedImage(product.imageUrl || "");
    }
  }, [product, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const transformedData = {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        unitId: data.unitId ? parseInt(data.unitId) : null,
        price: parseFloat(data.price),
        cost: parseFloat(data.cost),
        margin: parseFloat(data.margin),
        imageUrl: selectedImage || null,
      };

      if (product) {
        await apiRequest("PUT", `/api/products/${product.id}`, transformedData);
      } else {
        await apiRequest("POST", "/api/products", transformedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: product
          ? "Product updated successfully"
          : "Product created successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: product
          ? "Failed to update product"
          : "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const calculateMargin = () => {
    const price = parseFloat(form.getValues("price") || "0");
    const cost = parseFloat(form.getValues("cost") || "0");

    if (price > 0 && cost > 0) {
      const margin = price - cost;
      form.setValue("margin", margin.toFixed(2));
    }
  };

  const calculateCosts = () => {
    const formData = form.getValues();
    const ingredients = formData.ingredients || [];

    if (ingredients.length === 0) return;

    const batchSize = parseFloat(formData.batchSize || "1");
    const productionQuantity = parseFloat(formData.productionQuantity || "1");
    const normalLossMfg = parseFloat(formData.normalLossMfg || "5");
    const mfgAndPackagingCost = parseFloat(
      formData.mfgAndPackagingCost || "45",
    );
    const overheadCost = parseFloat(formData.overheadCost || "5");

    let subTotalForBatch = 0;

    ingredients.forEach((ingredient: any) => {
      const item = (inventoryItems as any[]).find(
        (item: any) => item.id.toString() === ingredient.inventoryItemId,
      );
      if (item) {
        const quantity = parseFloat(ingredient.quantity || "0");
        const cost = parseFloat(item.costPerUnit || "0");
        subTotalForBatch += quantity * cost;
      }
    });

    const totalForProduction = subTotalForBatch * productionQuantity;
    const effectiveUnits = batchSize * productionQuantity;
    const rmCostPerUnit = totalForProduction / effectiveUnits;
    const effectiveUnitsProduced = effectiveUnits * (1 - normalLossMfg / 100);
    const estimatedCostPerUnit = totalForProduction / effectiveUnitsProduced;
    const mfgCostPerUnit = estimatedCostPerUnit * (mfgAndPackagingCost / 100);
    const overheadCostPerUnit = estimatedCostPerUnit * (overheadCost / 100);
    const finalCostPerUnit =
      estimatedCostPerUnit + mfgCostPerUnit + overheadCostPerUnit;

    setCalculations({
      subTotalForBatch,
      totalForProduction,
      effectiveUnits,
      rmCostPerUnit,
      effectiveUnitsProduced,
      estimatedCostPerUnit,
      mfgCostPerUnit,
      overheadCostPerUnit,
      finalCostPerUnit,
    });

    // Auto-update cost field
    form.setValue("cost", finalCostPerUnit.toFixed(2));
  };

  useEffect(() => {
    calculateCosts();
  }, [
    form.watch("ingredients"),
    form.watch("batchSize"),
    form.watch("productionQuantity"),
    form.watch("normalLossMfg"),
    form.watch("mfgAndPackagingCost"),
    form.watch("overheadCost"),
  ]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Cost Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
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
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(categories as any[]).map((category: any) => (
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
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(units as any[]).map((unit: any) => (
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

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="350G" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Making Process..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Product Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Image</label>
                  <div className="flex items-center gap-4">
                    {selectedImage ? (
                      <div className="relative">
                        <img
                          src={selectedImage}
                          alt="Product preview"
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => setSelectedImage("")}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowMediaLibrary(true)}
                    >
                      Select Image
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Cost Price ({symbol})
                          {calculations.finalCostPerUnit > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              Calculated:{" "}
                              {formatCurrency(calculations.finalCostPerUnit)}
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              calculateMargin();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price ({symbol})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              calculateMargin();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="margin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margin Price ({symbol})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            readOnly
                            className="bg-gray-50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Calculator</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Calculate product cost based on ingredients and production
                  parameters
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Production Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="batchSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Size</FormLabel>
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
                        <FormLabel>Production Quantity</FormLabel>
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
                        <FormLabel>Normal Loss Mfg (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
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
                        <FormLabel>Mfg & Packaging (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Ingredients Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Ingredients</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({ inventoryItemId: "", quantity: "" })
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Ingredient
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-end">
                      <div className="flex-1">
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
                                  {(inventoryItems as any[]).map(
                                    (item: any) => (
                                      <SelectItem
                                        key={item.id}
                                        value={item.id.toString()}
                                      >
                                        {item.name} -{" "}
                                        {formatCurrency(item.costPerUnit)}/
                                        {item.unit}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="w-32">
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        className="mb-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Cost Summary */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Cost Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal for Batch:</span>
                        <span>
                          {formatCurrency(calculations.subTotalForBatch)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total for Production:</span>
                        <span>
                          {formatCurrency(calculations.totalForProduction)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>RM Cost per Unit:</span>
                        <span>
                          {formatCurrency(calculations.rmCostPerUnit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Cost per Unit:</span>
                        <span>
                          {formatCurrency(calculations.estimatedCostPerUnit)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Mfg Cost per Unit:</span>
                        <span>
                          {formatCurrency(calculations.mfgCostPerUnit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overhead Cost per Unit:</span>
                        <span>
                          {formatCurrency(calculations.overheadCostPerUnit)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Final Cost per Unit:</span>
                        <span>
                          {formatCurrency(calculations.finalCostPerUnit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            )}
            {product ? "Update" : "Create"} Product
          </Button>
        </div>

        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={(imageUrl) => setSelectedImage(imageUrl)}
        />
      </form>
    </Form>
  );
}

import { useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  Package,
  Scale,
  Target,
  Plus,
  Edit,
  Trash2,
  Minus,
} from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";

const productionScheduleSchema = z.object({
  scheduledDate: z.string().min(1, "Please select a date"),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Please select priority",
  }),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        productId: z.number().min(1, "Please select a product"),
        targetQuantity: z.number().min(1, "Target amount must be at least 1"),
        unit: z.enum(["kg", "packets"], {
          required_error: "Please select a unit",
        }),
      }),
    )
    .min(1, "At least one product is required"),
});

type ProductionScheduleData = z.infer<typeof productionScheduleSchema>;

interface ProductionItem {
  id: number;
  productId: number;
  productName: string;
  scheduledDate: string;
  targetQuantity: number;
  unit: "kg" | "packets";
  targetPackets?: number;
  packetsPerKg?: number;
  priority: "low" | "medium" | "high";
  status: string;
  notes?: string;
  assignedTo?: string;
}

export default function EnhancedProductionSchedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [editingItem, setEditingItem] = useState<ProductionItem | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: productionSchedule = [] } = useQuery({
    queryKey: ["/api/production-schedule", selectedDate],
  });

  const { data: todaySchedule = [] } = useQuery({
    queryKey: ["/api/production-schedule/today"],
  });

  const form = useForm<ProductionScheduleData>({
    resolver: zodResolver(productionScheduleSchema),
    defaultValues: {
      scheduledDate: selectedDate,
      priority: "medium",
      notes: "",
      products: [{ productId: 0, targetQuantity: 1, unit: "kg" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ProductionScheduleData) => {
      const response = await fetch("/api/production-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create schedule item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-schedule"] });
      form.reset({
        scheduledDate: selectedDate,
        priority: "medium",
        notes: "",
        products: [{ productId: 0, targetQuantity: 1, unit: "kg" }],
      });
      toast({
        title: "Schedule Created",
        description: "Production schedule items have been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create production schedule items.",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<ProductionScheduleData>;
    }) => {
      const response = await fetch(`/api/production-schedule/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update schedule item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-schedule"] });
      setEditingItem(null);
      toast({
        title: "Schedule Updated",
        description: "Production schedule item has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update production schedule item.",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/production-schedule/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete schedule item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-schedule"] });
      toast({
        title: "Schedule Deleted",
        description: "Production schedule item has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete production schedule item.",
        variant: "destructive",
      });
    },
  });

  const calculatePackets = (productId: number, targetKg: number): number => {
    const product = products.find((p: any) => p.id === productId);
    if (!product || !product.packetsPerKg) return 0;
    return Math.ceil(targetKg * product.packetsPerKg);
  };

  const onSubmit = async (data: ProductionScheduleData) => {
    try {
      // Create multiple schedule items, one for each product
      for (const product of data.products) {
        const scheduleData = {
          productId: product.productId,
          scheduledDate: data.scheduledDate,
          targetQuantity: product.targetQuantity,
          unit: product.unit,
          targetPackets:
            product.unit === "kg"
              ? calculatePackets(product.productId, product.targetQuantity)
              : product.targetQuantity,
          priority: data.priority,
          notes: data.notes,
        };

        const response = await fetch("/api/production-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scheduleData),
        });

        if (!response.ok) throw new Error("Failed to create schedule item");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/production-schedule"] });
      form.reset({
        scheduledDate: selectedDate,
        priority: "medium",
        notes: "",
        products: [{ productId: 0, targetQuantity: 1, unit: "kg" }],
      });

      toast({
        title: "Schedule Created",
        description: "Production schedule items have been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create production schedule items.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: ProductionItem) => {
    setEditingItem(item);
    form.reset({
      scheduledDate: item.scheduledDate,
      priority: item.priority,
      notes: item.notes || "",
      products: [
        {
          productId: item.productId,
          targetQuantity: item.targetQuantity,
          unit: item.unit,
        },
      ],
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    form.reset({
      scheduledDate: selectedDate,
      priority: "medium",
      notes: "",
      products: [{ productId: 0, targetQuantity: 1, unit: "kg" }],
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    form.setValue("scheduledDate", selectedDate);
  }, [selectedDate, form]);

  return (
    <div className="space-y-6">
      {/* Today's Schedule Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Production Schedule
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, MMMM do, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No production scheduled for today
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaySchedule.map((item: ProductionItem) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{item.productName}</h4>
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>
                        {item.targetQuantity} {item.unit}
                      </span>
                      {item.unit === "kg" && item.targetPackets && (
                        <span className="text-gray-400">
                          ({item.targetPackets} packets)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <Badge className={getStatusColor(item.status)}>
                        {item.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Management */}
      <div className="space-y-6">
        {/* Add/Edit Schedule Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {editingItem
                ? "Edit Schedule Item"
                : "Add Multiple Products to Schedule"}
            </CardTitle>
            <CardDescription>
              Schedule multiple products for production on the same date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    {...form.register("scheduledDate")}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                  {form.formState.errors.scheduledDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.scheduledDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={form.watch("priority")}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      form.setValue("priority", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    {...form.register("notes")}
                    placeholder="Additional notes or instructions"
                  />
                </div>
              </div>
              {/* Products Section */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">
                        Product
                      </th>
                      <th scope="col" className="px-6 py-3 text-left">
                        Target Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left">
                        Unit
                      </th>
                      <th scope="col" className="px-6 py-3 text-left">
                        Estimated Packets
                      </th>
                      <th scope="col" className="px-6 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100 text-sm text-gray-700">
                    {fields.map((field, index) => (
                      <tr
                        key={field.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Product Select */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={
                              form
                                .watch(`products.${index}.productId`)
                                ?.toString() || ""
                            }
                            onValueChange={(value) =>
                              form.setValue(
                                `products.${index}.productId`,
                                parseInt(value),
                              )
                            }
                          >
                            <SelectTrigger className="w-full sm:w-[240px] h-9">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product: any) => (
                                <SelectItem
                                  key={product.id}
                                  value={product.id.toString()}
                                >
                                  {product.name}
                                  {product.packetsPerKg && (
                                    <span className="text-gray-500 ml-2">
                                      ({product.packetsPerKg} packets/kg)
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Target Quantity Input */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            step="0.1"
                            {...form.register(
                              `products.${index}.targetQuantity`,
                              {
                                valueAsNumber: true,
                              },
                            )}
                            placeholder="Enter amount"
                            className="w-28 h-9 px-2"
                          />
                        </td>

                        {/* Unit Select */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={form.watch(`products.${index}.unit`)}
                            onValueChange={(value: "kg" | "packets") =>
                              form.setValue(`products.${index}.unit`, value)
                            }
                          >
                            <SelectTrigger className="h-9 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">
                                <div className="flex items-center gap-2">
                                  <Scale className="h-4 w-4" />
                                  Kilograms (kg)
                                </div>
                              </SelectItem>
                              <SelectItem value="packets">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Packets
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Estimated Packets Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {form.watch(`products.${index}.unit`) === "kg" &&
                          form.watch(`products.${index}.productId`) &&
                          form.watch(`products.${index}.targetQuantity`) ? (
                            <div className="flex items-center gap-1 text-blue-700 text-sm">
                              <Package className="h-4 w-4" />
                              {calculatePackets(
                                form.watch(`products.${index}.productId`),
                                form.watch(`products.${index}.targetQuantity`),
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => remove(index)}
                              className="p-1 h-9 w-9 flex items-center justify-center"
                              title="Remove"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Add Product Button Row */}
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-right border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            append({
                              productId: 0,
                              targetQuantity: 1,
                              unit: "kg",
                            })
                          }
                          className="flex items-center gap-1 px-3 h-9 hover:shadow"
                        >
                          <Plus className="h-4 w-4" />
                          Add Product
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="w-full flex justify-end">
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      createScheduleMutation.isPending ||
                      updateScheduleMutation.isPending
                    }
                    className="flex-1"
                  >
                    {editingItem ? "Update Schedule" : "Add to Schedule"}
                  </Button>
                  {editingItem && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      className="text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

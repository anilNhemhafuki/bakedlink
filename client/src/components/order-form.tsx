import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { z } from "zod";

const orderFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  company: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.string().min(1, "Quantity is required"),
        unitPrice: z.string().min(1, "Unit price is required"),
      }),
    )
    .min(1, "At least one item is required"),
});

interface OrderFormProps {
  onSuccess?: () => void;
}

export default function OrderForm({ onSuccess }: OrderFormProps) {
  const { toast } = useToast();
  const { formatCurrency, symbol } = useCurrency();

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  const form = useForm({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      company: "",
      totalAmount: "",
      dueDate: "",
      notes: "",
      items: [{ productId: "", quantity: "", unitPrice: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Order form data:", data);

      // Validate items
      if (!data.items || data.items.length === 0) {
        throw new Error("At least one item is required");
      }

      const transformedData = {
        customerName: data.customerName.trim(),
        customerEmail:
          data.customerEmail && data.customerEmail.trim()
            ? data.customerEmail.trim()
            : null,
        customerPhone:
          data.customerPhone && data.customerPhone.trim()
            ? data.customerPhone.trim()
            : null,
        company:
          data.company && data.company.trim() ? data.company.trim() : null,
        totalAmount: data.totalAmount,
        dueDate: data.dueDate || null,
        notes: data.notes && data.notes.trim() ? data.notes.trim() : null,
        status: "pending",
        items: data.items.map((item: any) => {
          const product = products.find((p: any) => p.id.toString() === item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unit: product?.unit || null,
            unitId: product?.unitId || null,
          };
        }),
      };

      console.log("Transformed order data:", transformedData);
      return apiRequest("POST", "/api/orders", transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/dashboard/recent-orders"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      form.reset();
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Order creation error:", error);
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
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const calculateTotal = () => {
    const items = form.getValues("items");
    const total = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity || "0");
      const unitPrice = parseFloat(item.unitPrice || "0");
      return sum + quantity * unitPrice;
    }, 0);

    form.setValue("totalAmount", total.toFixed(2));
  };

  const updateItemPrice = (index: number, productId: string) => {
    const product = products.find((p: any) => p.id.toString() === productId);
    if (product) {
      form.setValue(`items.${index}.unitPrice`, product.price.toString());
      calculateTotal();
    }
  };

  // Auto-calculate total when items change
  const watchedItems = form.watch("items");
  React.useEffect(() => {
    calculateTotal();
  }, [watchedItems]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
      >
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="customer@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Order Items */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-sm font-semibold text-gray-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price ({symbol})
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                updateItemPrice(index, value);
                              }}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product: any) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id.toString()}
                                  >
                                    {product.name}{" "}
                                    {product.unit
                                      ? `(${product.unit.name})`
                                      : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                calculateTotal();
                              }}
                              className="w-24"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="8.50"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                calculateTotal();
                              }}
                              className="w-24"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        remove(index);
                        calculateTotal();
                      }}
                      disabled={fields.length === 1}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}

              {/* Add Item Button Row */}
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ productId: "", quantity: "", unitPrice: "" })
                    }
                  >
                    Add Item
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount ({symbol})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        readOnly
                        className="bg-gray-50 font-semibold text-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Special instructions or requests..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
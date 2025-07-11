
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Plus, Minus, ShoppingCart } from "lucide-react";

const orderFormSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  deliveryAddress: z
    .string()
    .min(10, "Please provide complete delivery address"),
  specialInstructions: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.number(),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unitPrice: z.number(),
        totalPrice: z.number(),
      }),
    )
    .min(1, "At least one item is required"),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function PublicOrderForm() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      deliveryDate: "",
      deliveryAddress: "",
      specialInstructions: "",
      items: [],
    },
  });

  const submitOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Sending order to API:", data);
      
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      console.log("API Response:", responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || `Server error: ${response.status}`);
      }
      
      return responseData;
    },
    onSuccess: (data) => {
      console.log("Order submitted successfully:", data);
      
      // Show success toast
      toast({
        title: "🎉 Order Submitted Successfully!",
        description: `Order ${data.orderNumber} has been received. We'll contact you soon with confirmation details.`,
        duration: 6000,
      });
      
      // Reset form and clear items
      form.reset({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        deliveryDate: "",
        deliveryAddress: "",
        specialInstructions: "",
        items: [],
      });
      setOrderItems([]);
      setSelectedProduct(null);
      setQuantity(1);
      
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      console.error("Order submission error:", error);
      
      // Show error toast with detailed message
      toast({
        title: "❌ Order Submission Failed",
        description: error.message || "There was an error submitting your order. Please check your information and try again.",
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const addItemToOrder = () => {
    if (!selectedProduct) return;

    const product = products.find((p: any) => p.id === selectedProduct);
    if (!product) return;

    const existingItemIndex = orderItems.findIndex(
      (item) => item.productId === selectedProduct,
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].totalPrice =
        updatedItems[existingItemIndex].quantity * parseFloat(product.price);
      setOrderItems(updatedItems);
    } else {
      const newItem: OrderItem = {
        productId: selectedProduct,
        productName: product.name,
        quantity,
        unitPrice: parseFloat(product.price),
        totalPrice: quantity * parseFloat(product.price),
      };
      setOrderItems([...orderItems, newItem]);
    }

    setSelectedProduct(null);
    setQuantity(1);
  };

  const removeItemFromOrder = (productId: number) => {
    setOrderItems(orderItems.filter((item) => item.productId !== productId));
  };

  const updateItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(productId);
      return;
    }

    const updatedItems = orderItems.map((item) => {
      if (item.productId === productId) {
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: newQuantity * item.unitPrice,
        };
      }
      return item;
    });
    setOrderItems(updatedItems);
  };

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );

  const onSubmit = (data: OrderFormData) => {
    // Validate order items
    if (orderItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please add at least one item to your order.",
        variant: "destructive",
      });
      return;
    }

    // Validate delivery date is at least 24 hours from now
    const deliveryDate = new Date(data.deliveryDate);
    const minDeliveryDate = new Date();
    minDeliveryDate.setHours(minDeliveryDate.getHours() + 24);
    
    if (deliveryDate < minDeliveryDate) {
      toast({
        title: "Invalid Delivery Date",
        description: "Delivery date must be at least 24 hours from now.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!data.customerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    if (!data.customerEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    if (!data.customerPhone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!data.deliveryAddress.trim() || data.deliveryAddress.trim().length < 10) {
      toast({
        title: "Address Required",
        description: "Please provide a complete delivery address.",
        variant: "destructive",
      });
      return;
    }

    // Update form with current items for validation
    form.setValue("items", orderItems);

    // Prepare order data for submission
    const orderData = {
      customerName: data.customerName.trim(),
      customerEmail: data.customerEmail.trim(),
      customerPhone: data.customerPhone.trim(),
      deliveryDate: data.deliveryDate,
      deliveryAddress: data.deliveryAddress.trim(),
      specialInstructions: data.specialInstructions?.trim() || "",
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };

    console.log("Submitting order data:", orderData);
    submitOrderMutation.mutate(orderData);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sweet Treats Order Form
          </h1>
          <p className="text-gray-600">Place your custom bakery order online</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Loading overlay */}
          {submitOrderMutation.isPending && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Submitting your order...</p>
                <p className="text-gray-600">Please wait while we process your request.</p>
              </div>
            </div>
          )}
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>
                Please provide your contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Full Name *</Label>
                <Input
                  id="customerName"
                  {...form.register("customerName")}
                  placeholder="Enter your full name"
                  disabled={submitOrderMutation.isPending}
                />
                {form.formState.errors.customerName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.customerName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="customerEmail">Email Address *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  {...form.register("customerEmail")}
                  placeholder="Enter your email"
                  disabled={submitOrderMutation.isPending}
                />
                {form.formState.errors.customerEmail && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.customerEmail.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <Input
                  id="customerPhone"
                  {...form.register("customerPhone")}
                  placeholder="Enter your phone number"
                  disabled={submitOrderMutation.isPending}
                />
                {form.formState.errors.customerPhone && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.customerPhone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="deliveryDate">Delivery Date *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  {...form.register("deliveryDate")}
                  min={
                    new Date(Date.now() + 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  }
                  disabled={submitOrderMutation.isPending}
                />
                {form.formState.errors.deliveryDate && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.deliveryDate.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                <Textarea
                  id="deliveryAddress"
                  {...form.register("deliveryAddress")}
                  placeholder="Enter complete delivery address"
                  rows={3}
                  disabled={submitOrderMutation.isPending}
                />
                {form.formState.errors.deliveryAddress && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.deliveryAddress.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="specialInstructions">
                  Special Instructions
                </Label>
                <Textarea
                  id="specialInstructions"
                  {...form.register("specialInstructions")}
                  placeholder="Any special requests or instructions for your order"
                  rows={3}
                  disabled={submitOrderMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Select Products
              </CardTitle>
              <CardDescription>Choose items for your order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end mb-6">
                <div className="flex-1">
                  <Label>Product</Label>
                  <Select
                    value={selectedProduct?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedProduct(parseInt(value))
                    }
                    disabled={submitOrderMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => {
                        const unit = units.find((u: any) => u.id === product.unitId);
                        return (
                          <SelectItem
                            key={product.id}
                            value={product.id.toString()}
                          >
                            {product.name} - {formatCurrency(parseFloat(product.price))} 
                            {unit && ` per ${unit.abbreviation}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-20"
                    disabled={submitOrderMutation.isPending}
                  />
                </div>

                <Button
                  type="button"
                  onClick={addItemToOrder}
                  disabled={!selectedProduct || submitOrderMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {/* Order Items */}
              {orderItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Your Order:</h3>
                  {orderItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{item.productName}</h4>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.unitPrice)} per {(() => {
                            const product = products.find((p: any) => p.id === item.productId);
                            const unit = units.find((u: any) => u.id === product?.unitId);
                            return unit?.abbreviation || 'unit';
                          })()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateItemQuantity(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateItemQuantity(
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <div className="ml-4 text-right">
                          <p className="font-semibold">
                            {formatCurrency(item.totalPrice)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeItemFromOrder(item.productId)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="text-right pt-4 border-t">
                    <p className="text-xl font-bold">
                      Total: {formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              disabled={
                submitOrderMutation.isPending || orderItems.length === 0
              }
              className="min-w-[200px]"
            >
              {submitOrderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting Order...
                </>
              ) : (
                "Submit Order"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

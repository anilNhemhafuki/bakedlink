import { useState, useRef } from "react";
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
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Plus, Minus, ShoppingCart, Upload, FileCheck, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Assuming these are available

// Define the schema with added fields for file upload and terms
const orderFormSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  deliveryAddress: z
    .string()
    .min(10, "Please provide complete delivery address"),
  specialInstructions: z.string().max(1000, "Instructions cannot exceed 1000 characters").optional(),
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
  uploadedFiles: z.any().optional(), // For file metadata if needed by react-hook-form
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// --- Utility Functions ---

// Function to simulate file upload and return file metadata
const simulateFileUpload = async (file: File): Promise<{ name: string; size: number; type: string }> => {
  // In a real app, this would involve uploading to a server and returning a URL or identifier
  console.log(`Simulating upload for: ${file.name}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return { name: file.name, size: file.size, type: file.type };
};

// Function to handle queuing and retrying submissions
const submitOrderWithRetry = async (orderData: any, maxRetries: number = 3) => {
  let retries = 0;
  
  // Add enhanced security and tracking data
  const submissionData = {
    ...orderData,
    referenceId: `PUB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    formVersion: "2.0",
    submissionTimestamp: new Date().toISOString(),
    submissionStart: Date.now(),
    source: "public_order_form",
    clientInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  };

  while (retries < maxRetries) {
    try {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(submissionData),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || `Server error: ${response.status}`);
      }
      return responseData;
    } catch (error: any) {
      retries++;
      console.error(`Submission attempt ${retries} failed:`, error.message);
      if (retries >= maxRetries) {
        throw error;
      }
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, retries) + Math.random() * 1000, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// --- Form Components ---

function CustomerInfoSection() {
  const { toast } = useToast();
  const form = useFormContext<OrderFormData>();
  const { register, formState: { errors }, setValue, watch } = form;
  const submitOrderMutation = useMutation({
    mutationFn: (data: OrderFormData) => submitOrderWithRetry(data),
    onSuccess: (data) => {
      toast({
        title: "🎉 Order Submitted Successfully!",
        description: `Order ${data.orderNumber} has been received. We'll contact you soon with confirmation details.`,
        duration: 6000,
      });
      form.reset({
        customerName: "", customerEmail: "", customerPhone: "", deliveryDate: "", deliveryAddress: "",
        specialInstructions: "", items: [], uploadedFiles: [], agreeToTerms: false
      });
      setOrderItems([]);
      setUploadedFiles([]);
      setSelectedProduct(null);
      setQuantity(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Order Submission Failed",
        description: error.message || "There was an error submitting your order. Please check your information and try again.",
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const { data: products = [] } = useQuery({ queryKey: ["/api/products"] });
  const { data: units = [] } = useQuery({ queryKey: ["/api/units"] });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const addItemToOrder = () => {
    if (!selectedProduct) return;
    const product = products.find((p: any) => p.id === selectedProduct);
    if (!product) return;

    const existingItemIndex = orderItems.findIndex((item) => item.productId === selectedProduct);

    if (existingItemIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].totalPrice = updatedItems[existingItemIndex].quantity * parseFloat(product.price);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles: File[] = [];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_FILES = 10;

    for (const file of files) {
      if (uploadedFiles.length + newFiles.length >= MAX_FILES) {
        toast({
          title: "Too Many Files",
          description: `You can only upload up to ${MAX_FILES} files.`,
          variant: "destructive",
        });
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: `File "${file.name}" exceeds the 10MB limit.`,
          variant: "destructive",
        });
        continue;
      }
      if (!['image/*', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: `File "${file.name}" has an unsupported type.`,
          variant: "destructive",
        });
        continue;
      }
      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      const uploadedMetadata = await Promise.all(newFiles.map(simulateFileUpload));
      setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
      // Update form with file metadata if needed by your schema
      setValue("uploadedFiles", [...uploadedFiles, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
    setValue("uploadedFiles", uploadedFiles.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = (data: OrderFormData) => {
    // Comprehensive validation
    if (orderItems.length === 0) {
      toast({
        title: "❌ No Items Selected",
        description: "Please add at least one item to your order to proceed.",
        variant: "destructive",
      });
      return;
    }

    const deliveryDate = new Date(data.deliveryDate);
    const minDeliveryDate = new Date();
    minDeliveryDate.setHours(minDeliveryDate.getHours() + 24);

    if (deliveryDate < minDeliveryDate) {
      toast({
        title: "⏰ Invalid Delivery Date",
        description: "Delivery date must be at least 24 hours from now to ensure proper preparation time.",
        variant: "destructive",
      });
      return;
    }

    // Enhanced validation
    const validationResult = orderFormSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "📋 Please Check Your Information",
        description: firstError.message,
        variant: "destructive",
      });
      console.error("Validation errors:", validationResult.error.errors);
      return;
    }

    // Validate total amount
    const calculatedTotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    if (calculatedTotal <= 0) {
      toast({
        title: "💰 Invalid Order Total",
        description: "Order total must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    const orderDataToSend: any = {
      ...data,
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      // In a real app, you would send file data or references here
      // For now, we'll assume backend handles file uploads separately or we send metadata
      // The `uploadedFiles` in `data` contains the File objects from the form input
      // The backend needs to be prepared to receive and process these files
    };

    submitOrderMutation.mutate(orderDataToSend);
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
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
            {...register("customerName")}
            placeholder="Enter your full name"
            disabled={submitOrderMutation.isPending}
          />
          {errors.customerName && (
            <p className="text-sm text-red-600 mt-1">{errors.customerName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="customerEmail">Email Address *</Label>
          <Input
            id="customerEmail"
            type="email"
            {...register("customerEmail")}
            placeholder="Enter your email"
            disabled={submitOrderMutation.isPending}
          />
          {errors.customerEmail && (
            <p className="text-sm text-red-600 mt-1">{errors.customerEmail.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="customerPhone">Phone Number *</Label>
          <Input
            id="customerPhone"
            {...register("customerPhone")}
            placeholder="Enter your phone number"
            disabled={submitOrderMutation.isPending}
          />
          {errors.customerPhone && (
            <p className="text-sm text-red-600 mt-1">{errors.customerPhone.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="deliveryDate">Delivery Date *</Label>
          <Input
            id="deliveryDate"
            type="date"
            {...register("deliveryDate")}
            min={
              new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            }
            disabled={submitOrderMutation.isPending}
          />
          {errors.deliveryDate && (
            <p className="text-sm text-red-600 mt-1">{errors.deliveryDate.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="deliveryAddress">Delivery Address *</Label>
          <Textarea
            id="deliveryAddress"
            {...register("deliveryAddress")}
            placeholder="Enter complete delivery address"
            rows={3}
            disabled={submitOrderMutation.isPending}
          />
          {errors.deliveryAddress && (
            <p className="text-sm text-red-600 mt-1">{errors.deliveryAddress.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="specialInstructions">
            Special Instructions
          </Label>
          <Textarea
            id="specialInstructions"
            {...register("specialInstructions")}
            placeholder="Any special requests or instructions for your order"
            rows={3}
            disabled={submitOrderMutation.isPending}
            maxLength={1000}
          />
          {errors.specialInstructions && (
            <p className="text-sm text-red-600 mt-1">{errors.specialInstructions.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductSelectionSection() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const form = useFormContext<OrderFormData>();
  const { register, formState: { errors }, setValue, watch } = form;
  const { products = [], isLoading: isLoadingProducts } = useQuery({ queryKey: ["/api/products"] });
  const { data: units = [], isLoading: isLoadingUnits } = useQuery({ queryKey: ["/api/units"] });

  const orderItems = watch("items"); // Use watch to get current items from form state
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const addItemToOrder = () => {
    if (!selectedProduct) {
      toast({ title: "No Product Selected", description: "Please select a product.", variant: "destructive" });
      return;
    }
    const product = products.find((p: any) => p.id === selectedProduct);
    if (!product) {
      toast({ title: "Product Not Found", description: "The selected product is invalid.", variant: "destructive" });
      return;
    }
    if (quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be at least 1.", variant: "destructive" });
      return;
    }

    const existingItemIndex = orderItems.findIndex((item) => item.productId === selectedProduct);

    let updatedItems;
    if (existingItemIndex >= 0) {
      updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].totalPrice = updatedItems[existingItemIndex].quantity * parseFloat(product.price);
    } else {
      const newItem: OrderItem = {
        productId: selectedProduct,
        productName: product.name,
        quantity,
        unitPrice: parseFloat(product.price),
        totalPrice: quantity * parseFloat(product.price),
      };
      updatedItems = [...orderItems, newItem];
    }
    setValue("items", updatedItems); // Update form state
    setSelectedProduct(null);
    setQuantity(1);
  };

  const removeItemFromOrder = (productId: number) => {
    const updatedItems = orderItems.filter((item) => item.productId !== productId);
    setValue("items", updatedItems);
  };

  const updateItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(productId);
      return;
    }

    const updatedItems = orderItems.map((item) => {
      if (item.productId === productId) {
        const product = products.find((p: any) => p.id === productId);
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: newQuantity * item.unitPrice,
        };
      }
      return item;
    });
    setValue("items", updatedItems);
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
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
              onValueChange={(value) => setSelectedProduct(parseInt(value))}
              disabled={isLoadingProducts || isLoadingUnits}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product: any) => {
                  const unit = units.find((u: any) => u.id === product.unitId);
                  return (
                    <SelectItem key={product.id} value={product.id.toString()}>
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
            />
          </div>

          <Button
            type="button"
            onClick={addItemToOrder}
            disabled={!selectedProduct || isLoadingProducts || isLoadingUnits}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

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
                    onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity === 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
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
              <p className="text-xl font-bold">Total: {formatCurrency(totalAmount)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FileUploadSection() {
  const { toast } = useToast();
  const form = useFormContext<OrderFormData>();
  const { setValue, watch, formState: { errors } } = form;
  const { isPending: isSubmitting } = useMutation({ mutationFn: () => Promise.resolve() }); // Dummy mutation for disabled state

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedFiles = watch("uploadedFiles", []);
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 10;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles: File[] = [];

    for (const file of files) {
      if (uploadedFiles.length + newFiles.length >= MAX_FILES) {
        toast({
          title: "Too Many Files",
          description: `You can only upload up to ${MAX_FILES} files.`,
          variant: "destructive",
        });
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: `File "${file.name}" exceeds the 10MB limit.`,
          variant: "destructive",
        });
        continue;
      }
      // Basic type check - you might want a more robust check
      if (!['image/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].some(type => file.type.startsWith(type))) {
        toast({
          title: "Invalid File Type",
          description: `File "${file.name}" has an unsupported type.`,
          variant: "destructive",
        });
        continue;
      }
      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      // In a real scenario, you'd upload files here and get back URLs or identifiers
      // For this example, we'll just store the File objects in form state
      const updatedFiles = [...uploadedFiles, ...newFiles];
      setValue("uploadedFiles", updatedFiles);
    }
    // Clear the input to allow selecting the same file again if needed
    event.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    const updatedFiles = uploadedFiles.filter((_, index) => index !== indexToRemove);
    setValue("uploadedFiles", updatedFiles);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Attachments (Optional)
        </CardTitle>
        <CardDescription>
          Upload artwork, specifications, or reference images (Max 10MB per file)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || uploadedFiles.length >= MAX_FILES}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              Accepted: Images, PDF, Text files (Max {MAX_FILES} files, {MAX_FILE_SIZE / 1024 / 1024}MB each)
            </p>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Uploaded Files:</h4>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeFile(index)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TermsAndConditionsSection() {
  const { register, formState: { errors } } = useFormContext<OrderFormData>();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3">
          <input
            id="agreeToTerms"
            type="checkbox"
            {...register("agreeToTerms")}
            className="mt-1"
          />
          <div className="flex-1">
            <Label htmlFor="agreeToTerms" className="text-sm">
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Privacy Policy
              </a>
            </Label>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600 mt-1">{errors.agreeToTerms.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicOrderForm() {
  const { toast } = useToast();
  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      deliveryDate: "",
      deliveryAddress: "",
      specialInstructions: "",
      items: [],
      uploadedFiles: [],
      agreeToTerms: false,
    },
  });

  const { handleSubmit, formState: { errors }, reset, watch } = methods;
  const { mutate: submitOrder, isPending: isSubmitting } = useMutation({
    mutationFn: (data: OrderFormData) => submitOrderWithRetry(data),
    onSuccess: (data) => {
      console.log("Order submitted successfully:", data);
      toast({
        title: "🎉 Order Submitted Successfully!",
        description: `Order ${data.orderNumber} has been received. We'll contact you soon with confirmation details.`,
        duration: 6000,
      });
      resetFormAndState();
    },
    onError: (error: any) => {
      console.error("Order submission error:", error);
      toast({
        title: "❌ Order Submission Failed",
        description: error.message || "There was an error submitting your order. Please check your information and try again.",
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const orderItems = watch("items");
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [orderReference, setOrderReference] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const resetFormAndState = () => {
    reset({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      deliveryDate: "",
      deliveryAddress: "",
      specialInstructions: "",
      items: [],
      uploadedFiles: [],
      agreeToTerms: false,
    });
    setOrderItems([]);
    setUploadedFiles([]);
    setSelectedProduct(null);
    setQuantity(1);
    setSubmissionStatus('idle');
    setOrderReference(null);
    setRetryCount(0);
  };

  const onSubmit = (data: OrderFormData) => {
    // Ensure items are correctly mapped from state if not directly in form state
    if (orderItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please add at least one item to your order.",
        variant: "destructive",
      });
      return;
    }

    // Convert File objects to something serializable if necessary for the API, or handle upload separately
    // For this example, we assume the backend might receive FormData or process files asynchronously
    const orderDataToSend: any = {
      ...data,
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      // If files need to be uploaded with the form data, construct FormData
      // const formData = new FormData();
      // Object.entries(data).forEach(([key, value]) => {
      //   if (key !== 'uploadedFiles') {
      //     formData.append(key, value as string);
      //   }
      // });
      // data.uploadedFiles.forEach((file: File) => {
      //   formData.append('files', file);
      // });
      // Then use formData in the mutationFn
    };

    setSubmissionStatus('submitting');
    setRetryCount(0); // Reset retry count on new submission attempt

    submitOrder(orderDataToSend); // Using the mutation directly
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

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <CustomerInfoSection />
            <ProductSelectionSection />
            <FileUploadSection />
            <TermsAndConditionsSection />

            {isSubmitting && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-lg font-semibold">Submitting your order...</p>
                  <p className="text-gray-600">Please wait while we process your request.</p>
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || orderItems.length === 0}
                className="min-w-[200px]"
              >
                {isSubmitting ? (
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
        </FormProvider>
      </div>
    </div>
  );
}
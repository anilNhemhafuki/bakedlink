import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  Factory,
  Camera,
  History,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  Layers,
  Eye,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";

// Form Schemas
const purchaseEntrySchema = z.object({
  inventoryItemId: z.number().min(1, "Please select an inventory item"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitCost: z.number().min(0.01, "Unit cost must be greater than 0"),
  supplierName: z.string().min(1, "Supplier name is required"),
  supplierInvoiceNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

const productionConsumeSchema = z.object({
  productId: z.number().min(1, "Please select a product"),
  productionQuantity: z.number().min(0.01, "Production quantity must be greater than 0"),
  productionScheduleId: z.number().optional(),
  notes: z.string().optional(),
});

const dailySnapshotSchema = z.object({
  snapshotDate: z.string().min(1, "Please select a date"),
});

type PurchaseEntryForm = z.infer<typeof purchaseEntrySchema>;
type ProductionConsumeForm = z.infer<typeof productionConsumeSchema>;
type DailySnapshotForm = z.infer<typeof dailySnapshotSchema>;

export default function ComprehensiveStockManagement() {
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch data
  const { data: inventoryItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: () => apiRequest("GET", "/api/inventory"),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("GET", "/api/products"),
  });

  const { data: stockAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/stock/alerts"],
    queryFn: () => apiRequest("GET", "/api/stock/alerts"),
  });

  const { data: recentSnapshots = [] } = useQuery({
    queryKey: ["/api/stock/snapshots"],
    queryFn: () => apiRequest("GET", "/api/stock/snapshots"),
  });

  // Filter inventory items based on search
  const filteredItems = inventoryItems.filter((item: any) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.invCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Purchase Entry Component
  function PurchaseEntryTab() {
    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
    
    const purchaseForm = useForm<PurchaseEntryForm>({
      resolver: zodResolver(purchaseEntrySchema),
      defaultValues: {
        quantity: 1,
        unitCost: 0,
        supplierName: "",
        supplierInvoiceNumber: "",
        batchNumber: "",
        expiryDate: "",
        notes: "",
      },
    });

    const purchaseEntryMutation = useMutation({
      mutationFn: (data: PurchaseEntryForm) =>
        apiRequest("POST", "/api/stock/purchase-entry", data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stock/alerts"] });
        toast({
          title: "Success",
          description: "Purchase entry created successfully with FIFO batch tracking",
        });
        setIsPurchaseDialogOpen(false);
        purchaseForm.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Error", 
          description: error.message || "Failed to create purchase entry",
          variant: "destructive",
        });
      },
    });

    const onPurchaseSubmit = (data: PurchaseEntryForm) => {
      purchaseEntryMutation.mutate(data);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Entry</h2>
            <p className="text-gray-600 dark:text-gray-400">Record new stock purchases with FIFO batch tracking</p>
          </div>
          <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-purchase" className="bg-green-600 hover:bg-green-700">
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Purchase Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record Purchase Entry</DialogTitle>
                <DialogDescription>
                  Create a new purchase entry with automatic FIFO batch tracking and cost calculations
                </DialogDescription>
              </DialogHeader>
              <Form {...purchaseForm}>
                <form onSubmit={purchaseForm.handleSubmit(onPurchaseSubmit)} className="space-y-4">
                  <FormField
                    control={purchaseForm.control}
                    name="inventoryItemId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inventory Item</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-inventory-item">
                              <SelectValue placeholder="Select inventory item" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {inventoryItems.map((item: any) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.name} ({item.invCode}) - Current: {item.currentStock} {item.unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={purchaseForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-quantity"
                              type="number"
                              step="0.01"
                              min="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={purchaseForm.control}
                      name="unitCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Cost ({symbol})</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-unit-cost"
                              type="number"
                              step="0.01"
                              min="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={purchaseForm.control}
                    name="supplierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-supplier-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={purchaseForm.control}
                      name="supplierInvoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input data-testid="input-invoice-number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={purchaseForm.control}
                      name="batchNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch Number</FormLabel>
                          <FormControl>
                            <Input data-testid="input-batch-number" placeholder="Auto-generated if empty" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={purchaseForm.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date (Optional)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-expiry-date" type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={purchaseForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea data-testid="input-notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      data-testid="button-submit-purchase"
                      type="submit"
                      disabled={purchaseEntryMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {purchaseEntryMutation.isPending ? "Creating..." : "Create Purchase Entry"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recent Purchase Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Batch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No recent purchase entries found
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Production Consumption Component
  function ProductionConsumeTab() {
    const [isConsumeDialogOpen, setIsConsumeDialogOpen] = useState(false);
    
    const consumeForm = useForm<ProductionConsumeForm>({
      resolver: zodResolver(productionConsumeSchema),
      defaultValues: {
        productionQuantity: 1,
        notes: "",
      },
    });

    const productionConsumeMutation = useMutation({
      mutationFn: (data: ProductionConsumeForm) =>
        apiRequest("POST", "/api/stock/production-consume", data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stock/alerts"] });
        toast({
          title: "Success",
          description: "Production consumption recorded successfully with FIFO allocation",
        });
        setIsConsumeDialogOpen(false);
        consumeForm.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to record production consumption",
          variant: "destructive",
        });
      },
    });

    const onConsumeSubmit = (data: ProductionConsumeForm) => {
      productionConsumeMutation.mutate(data);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Production Consumption</h2>
            <p className="text-gray-600 dark:text-gray-400">Record ingredient consumption with FIFO batch allocation</p>
          </div>
          <Dialog open={isConsumeDialogOpen} onOpenChange={setIsConsumeDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-consumption" className="bg-blue-600 hover:bg-blue-700">
                <Factory className="h-4 w-4 mr-2" />
                Record Production
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Record Production Consumption</DialogTitle>
                <DialogDescription>
                  Record ingredient consumption using FIFO (First In, First Out) allocation
                </DialogDescription>
              </DialogHeader>
              <Form {...consumeForm}>
                <form onSubmit={consumeForm.handleSubmit(onConsumeSubmit)} className="space-y-4">
                  <FormField
                    control={consumeForm.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-product">
                              <SelectValue placeholder="Select product to produce" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product: any) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={consumeForm.control}
                    name="productionQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Production Quantity</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-production-quantity"
                            type="number"
                            step="0.01"
                            min="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={consumeForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea data-testid="input-production-notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsConsumeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      data-testid="button-submit-consumption"
                      type="submit"
                      disabled={productionConsumeMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {productionConsumeMutation.isPending ? "Recording..." : "Record Consumption"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* BOM Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Bill of Materials Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Select a product to view its recipe and ingredient requirements</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Daily Snapshots Component
  function DailySnapshotsTab() {
    const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false);
    
    const snapshotForm = useForm<DailySnapshotForm>({
      resolver: zodResolver(dailySnapshotSchema),
      defaultValues: {
        snapshotDate: new Date().toISOString().split('T')[0],
      },
    });

    const createSnapshotMutation = useMutation({
      mutationFn: (data: DailySnapshotForm) =>
        apiRequest("POST", "/api/stock/daily-snapshot", data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/stock/snapshots"] });
        toast({
          title: "Success",
          description: "Daily snapshot created successfully",
        });
        setIsSnapshotDialogOpen(false);
        snapshotForm.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create daily snapshot",
          variant: "destructive",
        });
      },
    });

    const onSnapshotSubmit = (data: DailySnapshotForm) => {
      createSnapshotMutation.mutate(data);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Stock Snapshots</h2>
            <p className="text-gray-600 dark:text-gray-400">Immutable daily inventory snapshots for audit trails</p>
          </div>
          <Dialog open={isSnapshotDialogOpen} onOpenChange={setIsSnapshotDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-snapshot" className="bg-purple-600 hover:bg-purple-700">
                <Camera className="h-4 w-4 mr-2" />
                Create Snapshot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Daily Snapshot</DialogTitle>
                <DialogDescription>
                  Create an immutable snapshot of all inventory items for the selected date
                </DialogDescription>
              </DialogHeader>
              <Form {...snapshotForm}>
                <form onSubmit={snapshotForm.handleSubmit(onSnapshotSubmit)} className="space-y-4">
                  <FormField
                    control={snapshotForm.control}
                    name="snapshotDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Snapshot Date</FormLabel>
                        <FormControl>
                          <Input data-testid="input-snapshot-date" type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsSnapshotDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      data-testid="button-submit-snapshot"
                      type="submit"
                      disabled={createSnapshotMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {createSnapshotMutation.isPending ? "Creating..." : "Create Snapshot"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recent Snapshots */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Items Count</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSnapshots.length > 0 ? (
                  recentSnapshots.slice(0, 10).map((snapshot: any) => (
                    <TableRow key={snapshot.id} data-testid={`row-snapshot-${snapshot.id}`}>
                      <TableCell>{new Date(snapshot.snapshotDate).toLocaleDateString()}</TableCell>
                      <TableCell>{snapshot.itemsCount || 'N/A'}</TableCell>
                      <TableCell>{symbol}{parseFloat(snapshot.totalValue || '0').toFixed(2)}</TableCell>
                      <TableCell>{snapshot.capturedBy}</TableCell>
                      <TableCell>
                        <Badge variant={snapshot.isLocked ? "default" : "secondary"}>
                          {snapshot.isLocked ? "Locked" : "Unlocked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" data-testid={`button-view-snapshot-${snapshot.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No snapshots found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stock Overview Component
  function OverviewTab() {
    return (
      <div className="space-y-6">
        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              data-testid="input-search-items"
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Alerts Cards */}
        {stockAlerts && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Low Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stockAlerts.alertCounts?.lowStock || 0}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Items below minimum level</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stockAlerts.alertCounts?.expiring || 0}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Batches expiring in 30 days</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Out of Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {stockAlerts.alertCounts?.zeroStock || 0}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Items with zero stock</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inventory Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cost per Unit</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item: any) => {
                    const currentStock = parseFloat(item.currentStock || "0");
                    const minLevel = parseFloat(item.minLevel || "0");
                    const isLowStock = currentStock <= minLevel;
                    const isOutOfStock = currentStock === 0;

                    return (
                      <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-code-${item.id}`}>
                          {item.invCode}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-name-${item.id}`}>
                          {item.name}
                        </TableCell>
                        <TableCell data-testid={`text-stock-${item.id}`}>
                          {item.currentStock}
                        </TableCell>
                        <TableCell data-testid={`text-unit-${item.id}`}>
                          {item.unit}
                        </TableCell>
                        <TableCell data-testid={`text-cost-${item.id}`}>
                          {symbol}{parseFloat(item.costPerUnit || "0").toFixed(2)}
                        </TableCell>
                        <TableCell data-testid={`text-min-level-${item.id}`}>
                          {item.minLevel}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}
                            data-testid={`status-${item.id}`}
                          >
                            {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-view-batches-${item.id}`}
                            onClick={() => {
                              // TODO: Show batch details
                            }}
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Comprehensive Stock Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Advanced inventory management with FIFO tracking, batch control, and comprehensive reporting
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Package className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="purchase" data-testid="tab-purchase">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Purchase Entry
          </TabsTrigger>
          <TabsTrigger value="production" data-testid="tab-production">
            <Factory className="h-4 w-4 mr-2" />
            Production
          </TabsTrigger>
          <TabsTrigger value="snapshots" data-testid="tab-snapshots">
            <Camera className="h-4 w-4 mr-2" />
            Snapshots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="purchase">
          <PurchaseEntryTab />
        </TabsContent>

        <TabsContent value="production">
          <ProductionConsumeTab />
        </TabsContent>

        <TabsContent value="snapshots">
          <DailySnapshotsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
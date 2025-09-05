import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, FileText, CheckCircle, AlertCircle, Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { ProductionScheduleLabel, InsertProductionScheduleLabel, Product, Order, Unit } from '@shared/schema';

export default function LabelPrinting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewForm, setIsNewForm] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<ProductionScheduleLabel | null>(null);
  const [formData, setFormData] = useState<Partial<InsertProductionScheduleLabel>>({
    status: 'draft',
    priority: 'normal',
    isDraft: true,
    qualityCheckPassed: false,
  });

  // Fetch production schedule labels
  const { data: labelsData = [], isLoading: labelsLoading } = useQuery({
    queryKey: ["production-schedule-labels"],
    queryFn: async () => {
      try {
        console.log("🔄 Fetching production schedule labels...");
        const res = await apiRequest("GET", "/api/production-schedule-labels");
        console.log("📋 Labels API response:", res);
        
        // Handle different response formats
        if (res?.success && res?.labels) {
          return Array.isArray(res.labels) ? res.labels : [];
        }
        
        if (res?.labels) {
          return Array.isArray(res.labels) ? res.labels : [];
        }
        
        // If response is directly an array
        if (Array.isArray(res)) {
          return res;
        }
        
        console.warn("Unexpected labels response format:", res);
        return [];
      } catch (error) {
        console.error("Failed to fetch production schedule labels:", error);
        throw error;
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  const labels = Array.isArray(labelsData) ? labelsData : [];

  // Fetch products for dropdown
  const { data: productsData = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/products");
        console.log("Products API response:", res);
        
        // Handle different response formats
        if (res?.success && res?.products) {
          return Array.isArray(res.products) ? res.products : [];
        }
        
        if (res?.products) {
          return Array.isArray(res.products) ? res.products : [];
        }
        
        // If response is directly an array
        if (Array.isArray(res)) {
          return res;
        }
        
        console.warn("Unexpected products response format:", res);
        return [];
      } catch (error) {
        console.error("Failed to fetch products:", error);
        throw error;
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  const products = Array.isArray(productsData) ? productsData : [];

  // Fetch orders for dropdown
  const { data: ordersData = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/orders");
        return Array.isArray(res) ? res : res.orders || [];
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  const orders = Array.isArray(ordersData) ? ordersData : [];

  // Fetch units for dropdown
  const { data: unitsData = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/units");
        return Array.isArray(res) ? res : res.units || [];
      } catch (error) {
        console.error("Failed to fetch units:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  const units = Array.isArray(unitsData) ? unitsData : [];

  // Create/Update mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertProductionScheduleLabel) => {
      console.log("🔄 Saving production schedule label:", data);
      const response = await apiRequest('POST', '/api/production-schedule-labels', data);
      return response;
    },
    onSuccess: (data) => {
      console.log("✅ Label saved successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["production-schedule-labels"] });
      toast({ 
        title: 'Success', 
        description: 'Production schedule label saved successfully!' 
      });
      resetForm();
    },
    onError: (error: any) => {
      console.error("❌ Failed to save label:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to save production schedule label', 
        variant: 'destructive' 
      });
    },
  });

  // Close day mutation
  const closeDayMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      console.log("🔄 Closing day for labels:", ids);
      const response = await apiRequest('POST', '/api/production-schedule-labels/close-day', { ids });
      return response;
    },
    onSuccess: (data) => {
      console.log("✅ Day closed successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["production-schedule-labels"] });
      toast({ 
        title: 'Success', 
        description: 'Day closed successfully! Labels moved to production.' 
      });
    },
    onError: (error: any) => {
      console.error("❌ Failed to close day:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to close day', 
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      status: 'draft',
      priority: 'normal',
      isDraft: true,
      qualityCheckPassed: false,
    });
    setIsNewForm(false);
    setSelectedLabel(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.targetedQuantity) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData as InsertProductionScheduleLabel);
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setFormData(prev => ({
        ...prev,
        productId: product.id,
        productName: product.name,
        productSku: product.sku || '',
        productDescription: product.description || '',
        unit: product.unit || '',
        unitId: product.unitId || undefined,
      }));
    }
  };

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === parseInt(orderId));
    if (order) {
      setFormData(prev => ({
        ...prev,
        orderId: order.id,
        orderNumber: `Order #${order.id}`,
        customerName: order.customerName,
        orderDate: order.createdAt || undefined,
      }));
    }
  };

  const handleCloseDayForDrafts = () => {
    const draftIds = labels.filter(label => label.isDraft && !label.dayClosed).map(label => label.id);
    if (draftIds.length === 0) {
      toast({ title: 'Info', description: 'No draft labels to close' });
      return;
    }
    closeDayMutation.mutate(draftIds);
  };

  const printLabel = (label: ProductionScheduleLabel) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Production Label - ${label.productName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .label { border: 2px solid #000; padding: 15px; margin: 10px 0; }
              .header { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 10px; }
              .field { margin: 5px 0; }
              .field strong { display: inline-block; width: 120px; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="header">PRODUCTION LABEL</div>
              <div class="field"><strong>Product:</strong> ${label.productName}</div>
              <div class="field"><strong>SKU:</strong> ${label.productSku || 'N/A'}</div>
              <div class="field"><strong>Batch:</strong> ${label.batchNumber || 'N/A'}</div>
              <div class="field"><strong>Quantity:</strong> ${label.targetedQuantity} ${label.unit || ''}</div>
              <div class="field"><strong>Customer:</strong> ${label.customerName || 'N/A'}</div>
              <div class="field"><strong>Order:</strong> ${label.orderNumber || 'N/A'}</div>
              <div class="field"><strong>Expiry:</strong> ${label.expiryDate ? format(new Date(label.expiryDate), 'MMM dd, yyyy') : 'N/A'}</div>
              <div class="field"><strong>Weight/Vol:</strong> ${label.weightVolume || 'N/A'}</div>
              <div class="field"><strong>Notes:</strong> ${label.notes || 'N/A'}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Label Printing & Production Schedule</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewForm(true)} data-testid="button-new-label">
            <Plus className="w-4 h-4 mr-2" />
            New Label
          </Button>
          <Button 
            onClick={handleCloseDayForDrafts}
            variant="outline"
            disabled={closeDayMutation.isPending}
            data-testid="button-close-day"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Close Day
          </Button>
        </div>
      </div>

      {/* New/Edit Form */}
      {(isNewForm || selectedLabel) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isNewForm ? 'New Production Schedule Label' : `Edit Label - ${selectedLabel?.productName}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Order Information */}
                <div className="space-y-2">
                  <Label htmlFor="order-select">Order</Label>
                  <Select onValueChange={handleOrderSelect} data-testid="select-order">
                    <SelectTrigger>
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map(order => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          Order #{order.id} - {order.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Selection */}
                <div className="space-y-2">
                  <Label htmlFor="product-select">Product *</Label>
                  <Select onValueChange={handleProductSelect} data-testid="select-product">
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} {product.sku && `(${product.sku})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="targeted-quantity">Target Quantity *</Label>
                  <Input
                    id="targeted-quantity"
                    type="number"
                    step="0.01"
                    value={formData.targetedQuantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetedQuantity: e.target.value }))}
                    data-testid="input-target-quantity"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-2">
                  <Label htmlFor="unit-select">Unit</Label>
                  <Select 
                    value={formData.unitId?.toString() || ''} 
                    onValueChange={(value) => {
                      const unit = units.find(u => u.id === parseInt(value));
                      setFormData(prev => ({ 
                        ...prev, 
                        unitId: parseInt(value),
                        unit: unit?.abbreviation || ''
                      }));
                    }}
                    data-testid="select-unit"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actual Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="actual-quantity">Actual Quantity</Label>
                  <Input
                    id="actual-quantity"
                    type="number"
                    step="0.01"
                    value={formData.actualQuantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, actualQuantity: e.target.value }))}
                    data-testid="input-actual-quantity"
                  />
                </div>

                {/* Batch Number */}
                <div className="space-y-2">
                  <Label htmlFor="batch-number">Batch Number</Label>
                  <Input
                    id="batch-number"
                    value={formData.batchNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                    data-testid="input-batch-number"
                  />
                </div>

                {/* Weight/Volume */}
                <div className="space-y-2">
                  <Label htmlFor="weight-volume">Weight/Volume</Label>
                  <Input
                    id="weight-volume"
                    value={formData.weightVolume || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, weightVolume: e.target.value }))}
                    placeholder="e.g., 500g, 1.5L"
                    data-testid="input-weight-volume"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority || 'normal'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                    data-testid="select-priority"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.expiryDate && "text-muted-foreground"
                        )}
                        data-testid="button-expiry-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expiryDate ? format(new Date(formData.expiryDate), "MMM dd, yyyy") : "Pick expiry date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expiryDate ? new Date(formData.expiryDate) : undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, expiryDate: date?.toISOString().split('T')[0] }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Notes and Remarks */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Production Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any production notes..."
                    data-testid="textarea-notes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special-instructions">Special Instructions</Label>
                  <Textarea
                    id="special-instructions"
                    value={formData.specialInstructions || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                    placeholder="Add any special instructions..."
                    data-testid="textarea-special-instructions"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-label">
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? 'Saving...' : 'Save Label'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} data-testid="button-cancel">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Labels List */}
      <Card>
        <CardHeader>
          <CardTitle>Production Schedule Labels</CardTitle>
        </CardHeader>
        <CardContent>
          {labelsLoading ? (
            <div className="text-center py-8">Loading labels...</div>
          ) : labels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No production schedule labels found. Create your first label above.
            </div>
          ) : (
            <div className="space-y-4">
              {labels.map((label) => (
                <div key={label.id} className="border rounded-lg p-4 space-y-2" data-testid={`label-card-${label.id}`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg" data-testid={`text-product-name-${label.id}`}>
                        {label.productName}
                      </h3>
                      <p className="text-sm text-gray-600" data-testid={`text-product-details-${label.id}`}>
                        {label.productSku && `SKU: ${label.productSku} • `}
                        Target: {label.targetedQuantity} {label.unit}
                        {label.actualQuantity && ` • Actual: ${label.actualQuantity} ${label.unit}`}
                      </p>
                      {label.customerName && (
                        <p className="text-sm text-gray-600" data-testid={`text-customer-${label.id}`}>
                          Customer: {label.customerName}
                          {label.orderNumber && ` • Order: ${label.orderNumber}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={label.status === 'completed' ? 'default' : label.status === 'in_progress' ? 'secondary' : 'outline'}
                        data-testid={`badge-status-${label.id}`}
                      >
                        {label.status}
                      </Badge>
                      {label.priority !== 'normal' && (
                        <Badge 
                          variant={label.priority === 'urgent' ? 'destructive' : 'secondary'}
                          data-testid={`badge-priority-${label.id}`}
                        >
                          {label.priority}
                        </Badge>
                      )}
                      {label.isDraft && (
                        <Badge variant="outline" data-testid={`badge-draft-${label.id}`}>
                          Draft
                        </Badge>
                      )}
                    </div>
                  </div>

                  {(label.batchNumber || label.expiryDate || label.weightVolume) && (
                    <div className="text-sm text-gray-600 space-y-1">
                      {label.batchNumber && <div data-testid={`text-batch-${label.id}`}>Batch: {label.batchNumber}</div>}
                      {label.expiryDate && <div data-testid={`text-expiry-${label.id}`}>Expiry: {format(new Date(label.expiryDate), 'MMM dd, yyyy')}</div>}
                      {label.weightVolume && <div data-testid={`text-weight-${label.id}`}>Weight/Volume: {label.weightVolume}</div>}
                    </div>
                  )}

                  {(label.notes || label.specialInstructions) && (
                    <div className="text-sm">
                      {label.notes && <div className="italic" data-testid={`text-notes-${label.id}`}>Notes: {label.notes}</div>}
                      {label.specialInstructions && <div className="italic text-orange-600" data-testid={`text-instructions-${label.id}`}>Instructions: {label.specialInstructions}</div>}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => printLabel(label)}
                      data-testid={`button-print-${label.id}`}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Label
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setSelectedLabel(label);
                        setFormData(label);
                        setIsNewForm(false);
                      }}
                      data-testid={`button-edit-${label.id}`}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
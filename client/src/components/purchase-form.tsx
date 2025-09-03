
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";

interface PurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PurchaseItem {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: string;
  unitPrice: string;
  totalPrice: number;
  unit: string;
  currentStock: number;
  currentRate: number;
}

export function PurchaseForm({ isOpen, onClose }: PurchaseFormProps) {
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    supplierName: "",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentMethod: "cash",
    notes: "",
  });

  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    {
      id: "1",
      inventoryItemId: "",
      inventoryItemName: "",
      quantity: "",
      unitPrice: "",
      totalPrice: 0,
      unit: "",
      currentStock: 0,
      currentRate: 0,
    }
  ]);

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["/api/parties"],
  });

  const calculateTotalAmount = () => {
    return purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: string) => {
    const updatedItems = [...purchaseItems];
    const item = updatedItems[index];

    if (field === "inventoryItemId") {
      const selectedInventory = inventoryItems.find((inv: any) => inv.id.toString() === value);
      if (selectedInventory) {
        item.inventoryItemName = selectedInventory.name;
        item.unit = selectedInventory.unit;
        item.currentStock = parseFloat(selectedInventory.currentStock);
        item.currentRate = parseFloat(selectedInventory.costPerUnit);
        item.unitPrice = selectedInventory.costPerUnit; // Default to current rate
      }
    }

    item[field] = value as any;

    // Recalculate total price when quantity or unit price changes
    if (field === "quantity" || field === "unitPrice") {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      item.totalPrice = quantity * unitPrice;
    }

    updatedItems[index] = item;
    setPurchaseItems(updatedItems);
  };

  const addPurchaseItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      {
        id: Date.now().toString(),
        inventoryItemId: "",
        inventoryItemName: "",
        quantity: "",
        unitPrice: "",
        totalPrice: 0,
        unit: "",
        currentStock: 0,
        currentRate: 0,
      }
    ]);
  };

  const removePurchaseItem = (index: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    }
  };

  const purchaseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Purchase recorded successfully. Inventory updated with weighted average cost.",
      });
      onClose();
      // Reset form
      setFormData({
        supplierName: "",
        invoiceNumber: "",
        purchaseDate: new Date().toISOString().split('T')[0],
        paymentMethod: "cash",
        notes: "",
      });
      setPurchaseItems([{
        id: "1",
        inventoryItemId: "",
        inventoryItemName: "",
        quantity: "",
        unitPrice: "",
        totalPrice: 0,
        unit: "",
        currentStock: 0,
        currentRate: 0,
      }]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record purchase",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate form data
    if (!formData.supplierName.trim()) {
      toast({
        title: "Error",
        description: "Supplier name is required",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate purchase items
    const validItems = purchaseItems.filter(item => 
      item.inventoryItemId && 
      parseFloat(item.quantity) > 0 && 
      parseFloat(item.unitPrice) > 0
    );

    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "At least one valid purchase item is required",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      supplierName: formData.supplierName.trim(),
      invoiceNumber: formData.invoiceNumber.trim() || null,
      totalAmount: calculateTotalAmount(),
      paymentMethod: formData.paymentMethod,
      status: "completed",
      notes: formData.notes.trim() || null,
      items: validItems.map(item => ({
        inventoryItemId: parseInt(item.inventoryItemId),
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: item.totalPrice,
      })),
    };

    purchaseMutation.mutate(submitData);
    setIsSubmitting(false);
  };

  const renderWeightedAveragePreview = (item: PurchaseItem) => {
    if (!item.quantity || !item.unitPrice || item.currentStock === 0) {
      return null;
    }

    const purchaseQty = parseFloat(item.quantity);
    const purchaseRate = parseFloat(item.unitPrice);
    const currentValue = item.currentStock * item.currentRate;
    const purchaseValue = purchaseQty * purchaseRate;
    const newTotalQty = item.currentStock + purchaseQty;
    const newTotalValue = currentValue + purchaseValue;
    const newWeightedRate = newTotalValue / newTotalQty;

    return (
      <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 rounded">
        <strong>Weighted Average Preview:</strong><br/>
        Current: {item.currentStock} @ {symbol}{item.currentRate.toFixed(2)} = {symbol}{currentValue.toFixed(2)}<br/>
        Purchase: {purchaseQty} @ {symbol}{purchaseRate.toFixed(2)} = {symbol}{purchaseValue.toFixed(2)}<br/>
        New Total: {newTotalQty} @ {symbol}{newWeightedRate.toFixed(2)} = {symbol}{newTotalValue.toFixed(2)}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Record Purchase
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Purchase Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Purchase Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                    placeholder="Enter invoice number"
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date *</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({...formData, paymentMethod: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Purchase Items</CardTitle>
              <Button type="button" onClick={addPurchaseItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchaseItems.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">Item {index + 1}</h4>
                      {purchaseItems.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removePurchaseItem(index)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Inventory Item *</Label>
                        <Select
                          value={item.inventoryItemId}
                          onValueChange={(value) => handleItemChange(index, "inventoryItemId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((invItem: any) => (
                              <SelectItem key={invItem.id} value={invItem.id.toString()}>
                                {invItem.name} ({invItem.unit}) - Stock: {invItem.currentStock}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          placeholder="0.00"
                        />
                        {item.unit && <span className="text-xs text-gray-500">Unit: {item.unit}</span>}
                      </div>
                      
                      <div>
                        <Label>Rate per Unit *</Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            {symbol}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                            placeholder="0.00"
                            className="rounded-l-none"
                          />
                        </div>
                        {item.currentRate > 0 && (
                          <span className="text-xs text-gray-500">
                            Current: {symbol}{item.currentRate.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <Label>Total Value</Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            {symbol}
                          </span>
                          <Input
                            value={item.totalPrice.toFixed(2)}
                            className="rounded-l-none bg-gray-50"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>

                    {renderWeightedAveragePreview(item)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Total Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Purchase Amount:</span>
                <span>{symbol}{calculateTotalAmount().toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || calculateTotalAmount() === 0}
              className="bg-green-500 hover:bg-green-600 text-white min-w-[120px]"
            >
              {isSubmitting ? "Recording..." : "Record Purchase"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

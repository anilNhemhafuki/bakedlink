import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchBar from "@/components/search-bar";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ShoppingCart, Search, Filter } from "lucide-react";
import { format } from "date-fns";

interface Purchase {
  id: number;
  supplierName: string;
  totalAmount: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: PurchaseItem[];
}

interface PurchaseItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export default function Purchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["/api/purchases"],
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["/api/parties"],
  });

  const [purchaseForm, setPurchaseForm] = useState({
    partyId: "",
    supplierName: "",
    paymentMethod: "cash",
    items: [{ inventoryItemId: "", quantity: 1, unitPrice: "0" }],
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (purchaseData: any) => {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(purchaseData),
      });
      if (!response.ok) throw new Error("Failed to create purchase");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description:
          "Purchase recorded and stock quantities updated successfully",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record purchase",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = purchaseForm.items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.unitPrice) * item.quantity;
      return sum + itemTotal;
    }, 0);

    const purchaseData = {
      partyId: purchaseForm.partyId ? parseInt(purchaseForm.partyId) : null,
      supplierName: purchaseForm.supplierName,
      totalAmount: totalAmount.toString(),
      paymentMethod: purchaseForm.paymentMethod,
      status: "completed",
      items: purchaseForm.items.map((item) => ({
        inventoryItemId: parseInt(item.inventoryItemId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: (parseFloat(item.unitPrice) * item.quantity).toString(),
      })),
    };

    createPurchaseMutation.mutate(purchaseData);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setPurchaseForm({
      partyId: "",
      supplierName: "",
      paymentMethod: "cash",
      items: [{ inventoryItemId: "", quantity: 1, unitPrice: "0" }],
    });
  };

  const addItem = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [
        ...purchaseForm.items,
        { inventoryItemId: "", quantity: 1, unitPrice: "0" },
      ],
    });
  };

  const removeItem = (index: number) => {
    setPurchaseForm({
      ...purchaseForm,
      items: purchaseForm.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = purchaseForm.items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setPurchaseForm({ ...purchaseForm, items: updatedItems });
  };

  const filteredPurchases = purchases.filter((purchase: Purchase) => {
    const supplierName = purchase.supplierName ?? "";
    const matchesSearch = supplierName
      .toString()
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || purchase.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredPurchases, 'supplierName');

  const totalPurchases = purchases.reduce(
    (sum: number, purchase: Purchase) => sum + parseFloat(purchase.totalAmount),
    0,
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading purchases...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Record and track all purchase transactions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record New Purchase</DialogTitle>
              <DialogDescription>
                Enter the purchase transaction details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={purchaseForm.partyId}
                    onValueChange={(value) => {
                      const party = parties.find(
                        (p: any) => p.id === parseInt(value),
                      );
                      setPurchaseForm({
                        ...purchaseForm,
                        partyId: value,
                        supplierName: party?.name || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map((party: any) => (
                        <SelectItem key={party.id} value={party.id.toString()}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplierName">Supplier Name</Label>
                  <Input
                    id="supplierName"
                    value={purchaseForm.supplierName}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        supplierName: e.target.value,
                      })
                    }
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={purchaseForm.paymentMethod}
                  onValueChange={(value) =>
                    setPurchaseForm({ ...purchaseForm, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    Add Item
                  </Button>
                </div>
                {purchaseForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <Select
                        value={item.inventoryItemId}
                        onValueChange={(value) =>
                          updateItem(index, "inventoryItemId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((inventoryItem: any) => (
                            <SelectItem
                              key={inventoryItem.id}
                              value={inventoryItem.id.toString()}
                            >
                              {inventoryItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseInt(e.target.value),
                          )
                        }
                        min="1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, "unitPrice", e.target.value)
                        }
                        placeholder="Price"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={purchaseForm.items.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPurchaseMutation.isPending}
                >
                  Record Purchase
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {totalPurchases.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs.{" "}
              {purchases
                .filter(
                  (purchase: Purchase) =>
                    new Date(purchase.createdAt).toDateString() ===
                    new Date().toDateString(),
                )
                .reduce(
                  (sum: number, purchase: Purchase) =>
                    sum + parseFloat(purchase.totalAmount),
                  0,
                )
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Purchase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs.{" "}
              {purchases.length > 0
                ? (totalPurchases / purchases.length).toLocaleString()
                : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Purchase History</CardTitle>
            <div className="flex gap-2">
              <div className="w-[200px]">
                <SearchBar
                  placeholder="Search purchases..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedData.map((purchase: Purchase) => (
              <div key={purchase.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="font-medium">{purchase.supplierName}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      Rs. {parseFloat(purchase.totalAmount).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(purchase.createdAt), "MMM dd, yyyy")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{purchase.paymentMethod?.toUpperCase() ?? "N/A"}</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      purchase.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : purchase.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {purchase.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredPurchases.length === 0 && (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No purchases found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Start by recording your first purchase"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

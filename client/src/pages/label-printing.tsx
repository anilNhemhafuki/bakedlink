
import React, { useState, useEffect, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Save, FileText, CheckCircle, AlertCircle, Plus, Printer, QrCode, Camera, Package, Download, Upload, Scan } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { ProductionScheduleLabel, InsertProductionScheduleLabel, Product, Order, Unit } from '@shared/schema';

// Barcode generation utility
const generateBarcode = (text: string, width: number = 200, height: number = 50) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Clear canvas
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  
  // Simple barcode generation (Code 128 style)
  ctx.fillStyle = 'black';
  const barWidth = width / (text.length * 10);
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const x = i * barWidth * 10;
    
    // Generate bars based on character code
    for (let j = 0; j < 8; j++) {
      if (charCode & (1 << j)) {
        ctx.fillRect(x + j * barWidth, 10, barWidth, height - 30);
      }
    }
  }
  
  // Add text below barcode
  ctx.fillStyle = 'black';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height - 5);
  
  return canvas.toDataURL();
};

// QR Code generation utility (simplified)
const generateQRCode = (text: string, size: number = 100) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Simple QR code pattern (placeholder - in production use a proper QR library)
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'black';
  
  const moduleSize = size / 25;
  
  // Create a simple pattern
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      if ((i + j + text.length) % 3 === 0) {
        ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
      }
    }
  }
  
  return canvas.toDataURL();
};

export default function LabelPrinting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewForm, setIsNewForm] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<ProductionScheduleLabel | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [barcodeScanner, setBarcodeScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [labelTemplates, setLabelTemplates] = useState({
    standard: true,
    compact: false,
    detailed: false,
    custom: false
  });
  const [bulkPrintSettings, setBulkPrintSettings] = useState({
    copies: 1,
    labelSize: 'standard',
    includeBarcode: true,
    includeQR: false,
    includePrice: true,
    includeExpiry: true
  });
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
        
        if (res?.success && res?.labels) {
          return Array.isArray(res.labels) ? res.labels : [];
        }
        
        if (res?.labels) {
          return Array.isArray(res.labels) ? res.labels : [];
        }
        
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
        
        if (res?.success && res?.products) {
          return Array.isArray(res.products) ? res.products : [];
        }
        
        if (res?.products) {
          return Array.isArray(res.products) ? res.products : [];
        }
        
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

  // Barcode scanner functionality
  const startBarcodeScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setBarcodeScanner(true);
        
        // Simple barcode detection simulation
        const interval = setInterval(() => {
          if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              
              // Simulate barcode detection (in production, use a proper library)
              const simulatedBarcode = Math.random().toString(36).substring(7).toUpperCase();
              if (Math.random() > 0.95) { // 5% chance of "detecting" a barcode
                setScannedCode(simulatedBarcode);
                stopBarcodeScanner();
                clearInterval(interval);
                toast({
                  title: "Barcode Detected",
                  description: `Scanned: ${simulatedBarcode}`
                });
              }
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera for barcode scanning",
        variant: "destructive"
      });
    }
  };

  const stopBarcodeScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setBarcodeScanner(false);
  };

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
    
    // Generate barcode for the product
    const barcode = `${formData.productSku || 'PROD'}-${Date.now()}`;
    const updatedFormData = { ...formData, batchNumber: barcode };
    
    createMutation.mutate(updatedFormData as InsertProductionScheduleLabel);
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

  const handleBulkLabelSelection = (labelId: number, checked: boolean) => {
    if (checked) {
      setSelectedLabels(prev => [...prev, labelId]);
    } else {
      setSelectedLabels(prev => prev.filter(id => id !== labelId));
    }
  };

  const printLabel = (label: ProductionScheduleLabel, template: string = 'standard') => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const barcode = generateBarcode(label.batchNumber || label.productSku || 'DEFAULT');
      const qrCode = generateQRCode(`${label.productName}-${label.batchNumber || 'DEFAULT'}`);
      
      let labelContent = '';
      
      switch (template) {
        case 'compact':
          labelContent = `
            <div class="label compact-label">
              <div class="header">${label.productName}</div>
              ${bulkPrintSettings.includeBarcode ? `<img src="${barcode}" alt="Barcode" class="barcode-small"/>` : ''}
              <div class="field">Qty: ${label.targetedQuantity} ${label.unit || ''}</div>
              ${bulkPrintSettings.includePrice ? `<div class="field">Price: $${(Math.random() * 100).toFixed(2)}</div>` : ''}
            </div>
          `;
          break;
          
        case 'detailed':
          labelContent = `
            <div class="label detailed-label">
              <div class="header">
                <div class="product-name">${label.productName}</div>
                <div class="company-info">Production Label</div>
              </div>
              <div class="content-grid">
                <div class="left-section">
                  <div class="field"><strong>SKU:</strong> ${label.productSku || 'N/A'}</div>
                  <div class="field"><strong>Batch:</strong> ${label.batchNumber || 'N/A'}</div>
                  <div class="field"><strong>Quantity:</strong> ${label.targetedQuantity} ${label.unit || ''}</div>
                  <div class="field"><strong>Customer:</strong> ${label.customerName || 'N/A'}</div>
                  <div class="field"><strong>Order:</strong> ${label.orderNumber || 'N/A'}</div>
                  ${bulkPrintSettings.includeExpiry && label.expiryDate ? `<div class="field"><strong>Expiry:</strong> ${format(new Date(label.expiryDate), 'MMM dd, yyyy')}</div>` : ''}
                  <div class="field"><strong>Weight/Vol:</strong> ${label.weightVolume || 'N/A'}</div>
                </div>
                <div class="right-section">
                  ${bulkPrintSettings.includeBarcode ? `<img src="${barcode}" alt="Barcode" class="barcode"/>` : ''}
                  ${bulkPrintSettings.includeQR ? `<img src="${qrCode}" alt="QR Code" class="qr-code"/>` : ''}
                </div>
              </div>
              ${label.notes ? `<div class="notes"><strong>Notes:</strong> ${label.notes}</div>` : ''}
            </div>
          `;
          break;
          
        default: // standard
          labelContent = `
            <div class="label standard-label">
              <div class="header">PRODUCTION LABEL</div>
              <div class="product-name">${label.productName}</div>
              <div class="field"><strong>SKU:</strong> ${label.productSku || 'N/A'}</div>
              <div class="field"><strong>Batch:</strong> ${label.batchNumber || 'N/A'}</div>
              <div class="field"><strong>Quantity:</strong> ${label.targetedQuantity} ${label.unit || ''}</div>
              ${bulkPrintSettings.includeBarcode ? `<img src="${barcode}" alt="Barcode" class="barcode"/>` : ''}
              ${label.customerName ? `<div class="field"><strong>Customer:</strong> ${label.customerName}</div>` : ''}
              ${bulkPrintSettings.includeExpiry && label.expiryDate ? `<div class="field"><strong>Expiry:</strong> ${format(new Date(label.expiryDate), 'MMM dd, yyyy')}</div>` : ''}
            </div>
          `;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Production Label - ${label.productName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 10px; margin: 0; }
              .label { 
                border: 2px solid #000; 
                padding: 15px; 
                margin: 10px 0; 
                page-break-after: always;
                max-width: 400px;
              }
              .compact-label { max-width: 250px; padding: 8px; }
              .detailed-label { max-width: 600px; }
              .header { 
                font-size: 16px; 
                font-weight: bold; 
                text-align: center; 
                margin-bottom: 10px; 
                border-bottom: 1px solid #000;
                padding-bottom: 5px;
              }
              .product-name { 
                font-size: 18px; 
                font-weight: bold; 
                margin: 10px 0; 
                text-align: center;
              }
              .content-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 15px;
                margin: 10px 0;
              }
              .field { margin: 3px 0; font-size: 12px; }
              .field strong { display: inline-block; width: 80px; }
              .barcode { 
                max-width: 180px; 
                height: auto; 
                margin: 5px 0;
                display: block;
              }
              .barcode-small { 
                max-width: 120px; 
                height: auto; 
                margin: 5px 0;
              }
              .qr-code { 
                width: 80px; 
                height: 80px; 
                margin: 5px 0;
              }
              .notes { 
                margin-top: 10px; 
                font-size: 10px; 
                font-style: italic;
                border-top: 1px dashed #000;
                padding-top: 5px;
              }
              @media print { 
                body { margin: 0; } 
                .label { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            ${labelContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const printBulkLabels = () => {
    if (selectedLabels.length === 0) {
      toast({ title: 'No Labels Selected', description: 'Please select labels to print', variant: 'destructive' });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let allLabelsContent = '';
      
      selectedLabels.forEach(labelId => {
        const label = labels.find(l => l.id === labelId);
        if (label) {
          for (let copy = 0; copy < bulkPrintSettings.copies; copy++) {
            const barcode = generateBarcode(label.batchNumber || label.productSku || 'DEFAULT');
            const qrCode = generateQRCode(`${label.productName}-${label.batchNumber || 'DEFAULT'}`);
            
            allLabelsContent += `
              <div class="label">
                <div class="header">PRODUCTION LABEL ${copy > 0 ? `(Copy ${copy + 1})` : ''}</div>
                <div class="product-name">${label.productName}</div>
                <div class="field"><strong>SKU:</strong> ${label.productSku || 'N/A'}</div>
                <div class="field"><strong>Batch:</strong> ${label.batchNumber || 'N/A'}</div>
                <div class="field"><strong>Quantity:</strong> ${label.targetedQuantity} ${label.unit || ''}</div>
                ${bulkPrintSettings.includeBarcode ? `<img src="${barcode}" alt="Barcode" class="barcode"/>` : ''}
                ${bulkPrintSettings.includeQR ? `<img src="${qrCode}" alt="QR Code" class="qr-code"/>` : ''}
                ${label.customerName ? `<div class="field"><strong>Customer:</strong> ${label.customerName}</div>` : ''}
                ${bulkPrintSettings.includeExpiry && label.expiryDate ? `<div class="field"><strong>Expiry:</strong> ${format(new Date(label.expiryDate), 'MMM dd, yyyy')}</div>` : ''}
                ${bulkPrintSettings.includePrice ? `<div class="field"><strong>Price:</strong> $${(Math.random() * 100).toFixed(2)}</div>` : ''}
              </div>
            `;
          }
        }
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>Bulk Label Print - ${selectedLabels.length} Labels</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 10px; margin: 0; }
              .label { 
                border: 2px solid #000; 
                padding: 15px; 
                margin: 10px 0; 
                page-break-after: always;
                max-width: 400px;
              }
              .header { 
                font-size: 16px; 
                font-weight: bold; 
                text-align: center; 
                margin-bottom: 10px; 
                border-bottom: 1px solid #000;
                padding-bottom: 5px;
              }
              .product-name { 
                font-size: 18px; 
                font-weight: bold; 
                margin: 10px 0; 
                text-align: center;
              }
              .field { margin: 5px 0; font-size: 12px; }
              .field strong { display: inline-block; width: 80px; }
              .barcode { 
                max-width: 180px; 
                height: auto; 
                margin: 5px 0;
                display: block;
              }
              .qr-code { 
                width: 80px; 
                height: 80px; 
                margin: 5px 0;
              }
              @media print { 
                body { margin: 0; } 
                .label { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            ${allLabelsContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    toast({
      title: "Bulk Print Initiated",
      description: `Printing ${selectedLabels.length} labels with ${bulkPrintSettings.copies} copies each`
    });
  };

  // Auto-generate barcode when product changes
  useEffect(() => {
    if (formData.productSku) {
      const generatedBarcode = `${formData.productSku}-${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, batchNumber: generatedBarcode }));
    }
  }, [formData.productSku]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Barcode & Label Management</h1>
          <p className="text-gray-600 mt-1">Generate barcodes, print labels, and manage bulk printing</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewForm(true)} data-testid="button-new-label">
            <Plus className="w-4 h-4 mr-2" />
            New Label
          </Button>
          <Button 
            onClick={startBarcodeScanner}
            variant="outline"
            data-testid="button-barcode-scanner"
          >
            <Scan className="w-4 h-4 mr-2" />
            Scan Barcode
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

      {/* Barcode Scanner Modal */}
      {barcodeScanner && (
        <Card className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <CardContent className="bg-white p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Barcode Scanner</h3>
              <Button variant="outline" size="sm" onClick={stopBarcodeScanner}>
                Close
              </Button>
            </div>
            <div className="space-y-4">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full border rounded"
                style={{ maxHeight: '300px' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {scannedCode && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">Scanned Code: <strong>{scannedCode}</strong></p>
                </div>
              )}
              <div className="text-sm text-gray-600">
                Point your camera at a barcode to scan it
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="labels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="bulk-print">Bulk Print</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="barcodes">Barcodes</TabsTrigger>
        </TabsList>

        <TabsContent value="labels" className="space-y-6">
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

                    {/* Batch Number / Barcode */}
                    <div className="space-y-2">
                      <Label htmlFor="batch-number">Batch Number / Barcode</Label>
                      <div className="flex gap-2">
                        <Input
                          id="batch-number"
                          value={formData.batchNumber || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                          data-testid="input-batch-number"
                          placeholder="Auto-generated"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newBarcode = `${formData.productSku || 'PROD'}-${Date.now()}`;
                            setFormData(prev => ({ ...prev, batchNumber: newBarcode }));
                          }}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </div>
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
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedLabels.includes(label.id)}
                            onCheckedChange={(checked) => handleBulkLabelSelection(label.id, checked as boolean)}
                          />
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
                            {label.batchNumber && (
                              <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                Barcode: {label.batchNumber}
                              </p>
                            )}
                          </div>
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

                      {(label.expiryDate || label.weightVolume) && (
                        <div className="text-sm text-gray-600 space-y-1">
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
                          onClick={() => printLabel(label, 'compact')}
                          data-testid={`button-print-compact-${label.id}`}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Compact
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => printLabel(label, 'detailed')}
                          data-testid={`button-print-detailed-${label.id}`}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Detailed
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
        </TabsContent>

        <TabsContent value="bulk-print" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Label Printing</CardTitle>
              <p className="text-sm text-gray-600">Select multiple labels and configure bulk printing options</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Print Settings</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="copies">Number of Copies</Label>
                    <Input
                      id="copies"
                      type="number"
                      min="1"
                      max="100"
                      value={bulkPrintSettings.copies}
                      onChange={(e) => setBulkPrintSettings(prev => ({ ...prev, copies: parseInt(e.target.value) || 1 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="label-size">Label Size</Label>
                    <Select 
                      value={bulkPrintSettings.labelSize} 
                      onValueChange={(value) => setBulkPrintSettings(prev => ({ ...prev, labelSize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Include in Labels</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-barcode"
                          checked={bulkPrintSettings.includeBarcode}
                          onCheckedChange={(checked) => setBulkPrintSettings(prev => ({ ...prev, includeBarcode: checked as boolean }))}
                        />
                        <Label htmlFor="include-barcode">Barcode</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-qr"
                          checked={bulkPrintSettings.includeQR}
                          onCheckedChange={(checked) => setBulkPrintSettings(prev => ({ ...prev, includeQR: checked as boolean }))}
                        />
                        <Label htmlFor="include-qr">QR Code</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-price"
                          checked={bulkPrintSettings.includePrice}
                          onCheckedChange={(checked) => setBulkPrintSettings(prev => ({ ...prev, includePrice: checked as boolean }))}
                        />
                        <Label htmlFor="include-price">Price</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-expiry"
                          checked={bulkPrintSettings.includeExpiry}
                          onCheckedChange={(checked) => setBulkPrintSettings(prev => ({ ...prev, includeExpiry: checked as boolean }))}
                        />
                        <Label htmlFor="include-expiry">Expiry Date</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Selected Labels ({selectedLabels.length})</h3>
                  
                  {selectedLabels.length === 0 ? (
                    <p className="text-gray-500">No labels selected. Go to the Labels tab to select labels for bulk printing.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedLabels.map(labelId => {
                        const label = labels.find(l => l.id === labelId);
                        return label ? (
                          <div key={labelId} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{label.productName}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLabels(prev => prev.filter(id => id !== labelId))}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={printBulkLabels}
                  disabled={selectedLabels.length === 0}
                  className="flex-1"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print {selectedLabels.length} Labels ({selectedLabels.length * bulkPrintSettings.copies} total copies)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedLabels(labels.map(l => l.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedLabels([])}
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Label Templates</CardTitle>
              <p className="text-sm text-gray-600">Customize label layouts and formats</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Standard Template</h3>
                  <div className="border-2 border-dashed p-4 rounded-lg">
                    <div className="text-center font-bold mb-2">PRODUCTION LABEL</div>
                    <div className="text-sm space-y-1">
                      <div><strong>Product:</strong> Sample Product</div>
                      <div><strong>SKU:</strong> PROD-123</div>
                      <div><strong>Batch:</strong> BATCH-001</div>
                      <div><strong>Quantity:</strong> 100 pcs</div>
                      <div className="border border-gray-300 p-1 text-center">||||| BARCODE |||||</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={labelTemplates.standard}
                      onCheckedChange={(checked) => setLabelTemplates(prev => ({ ...prev, standard: checked as boolean }))}
                    />
                    <Label>Use as default</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Compact Template</h3>
                  <div className="border-2 border-dashed p-3 rounded-lg">
                    <div className="text-center font-bold text-sm mb-1">Sample Product</div>
                    <div className="text-xs space-y-1">
                      <div>Qty: 100 pcs</div>
                      <div>Price: $25.99</div>
                      <div className="border border-gray-300 p-1 text-center">||| CODE |||</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={labelTemplates.compact}
                      onCheckedChange={(checked) => setLabelTemplates(prev => ({ ...prev, compact: checked as boolean }))}
                    />
                    <Label>Enable template</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Detailed Template</h3>
                  <div className="border-2 border-dashed p-4 rounded-lg">
                    <div className="text-center font-bold mb-2">PRODUCTION LABEL</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div><strong>Product:</strong> Sample</div>
                        <div><strong>SKU:</strong> PROD-123</div>
                        <div><strong>Batch:</strong> B-001</div>
                        <div><strong>Qty:</strong> 100 pcs</div>
                        <div><strong>Customer:</strong> ABC Corp</div>
                      </div>
                      <div className="text-center">
                        <div className="border border-gray-300 p-2 mb-1">BARCODE</div>
                        <div className="border border-gray-300 p-2">QR</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={labelTemplates.detailed}
                      onCheckedChange={(checked) => setLabelTemplates(prev => ({ ...prev, detailed: checked as boolean }))}
                    />
                    <Label>Enable template</Label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Custom Template Builder</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Available Fields</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <Button variant="outline" size="sm">Product Name</Button>
                      <Button variant="outline" size="sm">SKU</Button>
                      <Button variant="outline" size="sm">Batch Number</Button>
                      <Button variant="outline" size="sm">Quantity</Button>
                      <Button variant="outline" size="sm">Unit</Button>
                      <Button variant="outline" size="sm">Customer</Button>
                      <Button variant="outline" size="sm">Expiry Date</Button>
                      <Button variant="outline" size="sm">Price</Button>
                      <Button variant="outline" size="sm">Barcode</Button>
                      <Button variant="outline" size="sm">QR Code</Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Template Preview</h4>
                    <div className="border-2 border-dashed p-4 rounded-lg min-h-32 bg-gray-50">
                      <p className="text-gray-500 text-center">Drag fields here to build your custom template</p>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Save Custom Template
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barcodes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Barcode Management</CardTitle>
              <p className="text-sm text-gray-600">Generate, scan, and manage barcodes for products and batches</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Barcode Generator</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="barcode-text">Barcode Text</Label>
                    <Input
                      id="barcode-text"
                      placeholder="Enter text to generate barcode"
                      value={scannedCode}
                      onChange={(e) => setScannedCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Barcode Type</Label>
                    <Select defaultValue="code128">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="code128">Code 128</SelectItem>
                        <SelectItem value="code39">Code 39</SelectItem>
                        <SelectItem value="ean13">EAN-13</SelectItem>
                        <SelectItem value="upca">UPC-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full">
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate Barcode
                  </Button>

                  {scannedCode && (
                    <div className="border rounded-lg p-4 text-center">
                      <img 
                        src={generateBarcode(scannedCode)} 
                        alt="Generated Barcode" 
                        className="mx-auto mb-2"
                      />
                      <p className="text-sm text-gray-600">Generated barcode for: {scannedCode}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">QR Code Generator</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="qr-text">QR Code Data</Label>
                    <Textarea
                      id="qr-text"
                      placeholder="Enter data for QR code (URL, text, JSON, etc.)"
                      value={scannedCode}
                      onChange={(e) => setScannedCode(e.target.value)}
                    />
                  </div>

                  <Button className="w-full">
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Code
                  </Button>

                  {scannedCode && (
                    <div className="border rounded-lg p-4 text-center">
                      <img 
                        src={generateQRCode(scannedCode)} 
                        alt="Generated QR Code" 
                        className="mx-auto mb-2"
                      />
                      <p className="text-sm text-gray-600">Generated QR code for: {scannedCode}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Barcode Scanner Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Scanner Configuration</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="auto-scan" />
                        <Label htmlFor="auto-scan">Auto-scan mode</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="beep-sound" />
                        <Label htmlFor="beep-sound">Beep on successful scan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="continuous-scan" />
                        <Label htmlFor="continuous-scan">Continuous scanning</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Supported Formats</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <Badge variant="secondary">Code 128</Badge>
                      <Badge variant="secondary">Code 39</Badge>
                      <Badge variant="secondary">EAN-13</Badge>
                      <Badge variant="secondary">UPC-A</Badge>
                      <Badge variant="secondary">QR Code</Badge>
                      <Badge variant="secondary">Data Matrix</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

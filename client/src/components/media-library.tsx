
import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Trash2, Upload, Image as ImageIcon, Search } from "lucide-react";

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
  contentType: string;
}

interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (imageUrl: string) => void;
  allowUpload?: boolean;
  allowDelete?: boolean;
}

export default function MediaLibrary({
  isOpen,
  onClose,
  onSelect,
  allowUpload = true,
  allowDelete = true,
}: MediaLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["/api/media"],
    enabled: isOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload image");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      await apiRequest("DELETE", `/api/media/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleImageSelect = (imageUrl: string) => {
    if (onSelect) {
      onSelect(imageUrl);
      onClose();
    } else {
      setSelectedImage(imageUrl);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredImages = images.filter((image: MediaItem) =>
    image.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Media Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          {allowUpload && (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploadMutation.isPending ? "Uploading..." : "Upload Image"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="text-sm text-gray-600">
                Supports JPG, PNG, GIF up to 5MB
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Images Grid */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-200 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredImages.map((image: MediaItem) => (
                  <Card
                    key={image.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedImage === image.url
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() => handleImageSelect(image.url)}
                  >
                    <CardContent className="p-2">
                      <div className="aspect-square relative mb-2">
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="w-full h-full object-cover rounded"
                          loading="lazy"
                        />
                        {allowDelete && (
                          <DeleteConfirmationDialog
                            trigger={
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            }
                            title="Delete Image"
                            itemName={image.filename}
                            onConfirm={() => deleteMutation.mutate(image.id)}
                            isLoading={deleteMutation.isPending}
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium truncate">
                          {image.filename}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(image.size)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {image.contentType.split("/")[1].toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No images found
                </h3>
                <p className="text-gray-500">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Upload your first image to get started"}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {onSelect && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedImage) {
                    onSelect(selectedImage);
                    onClose();
                  }
                }}
                disabled={!selectedImage}
              >
                Select Image
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, X, FileImage, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReceiptUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export const ReceiptUpload = ({ value, onChange, disabled }: ReceiptUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!user?.id) {
      toast.error("You must be logged in to upload receipts");
      return;
    }

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Please upload an image or PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("expense-receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("expense-receipts")
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success("Receipt uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value || !user?.id) return;

    try {
      // Extract file path from URL
      const url = new URL(value);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.findIndex(p => p === "expense-receipts");
      if (bucketIndex !== -1) {
        const filePath = pathParts.slice(bucketIndex + 1).join("/");
        await supabase.storage.from("expense-receipts").remove([filePath]);
      }
      onChange(null);
      toast.success("Receipt removed");
    } catch (error) {
      console.error("Remove error:", error);
      onChange(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  if (value) {
    const isImage = value.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
          {isImage ? (
            <img
              src={value}
              alt="Receipt"
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 flex items-center justify-center">
              <FileImage className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View full size
            </a>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop receipt here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports images and PDFs up to 10MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

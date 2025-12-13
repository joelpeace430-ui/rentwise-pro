import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, File, FileCheck, FileWarning, Loader2, FolderOpen } from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  name: string;
  document_type: "lease" | "receipt" | "notice" | "other";
  file_url: string;
  file_size: number | null;
  created_at: string;
}

interface PortalDocumentsProps {
  tenantId: string;
}

const PortalDocuments = ({ tenantId }: PortalDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        return;
      }

      setDocuments((data || []) as Document[]);
      setLoading(false);
    };

    fetchDocuments();
  }, [tenantId]);

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    
    try {
      const { data, error } = await supabase.storage
        .from("tenant-documents")
        .download(doc.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
    }
    
    setDownloading(null);
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "lease":
        return <FileCheck className="h-5 w-5 text-success" />;
      case "receipt":
        return <FileText className="h-5 w-5 text-primary" />;
      case "notice":
        return <FileWarning className="h-5 w-5 text-warning" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      lease: { className: "bg-success/10 text-success border-0", label: "Lease" },
      receipt: { className: "bg-primary/10 text-primary border-0", label: "Receipt" },
      notice: { className: "bg-warning/10 text-warning border-0", label: "Notice" },
      other: { className: "bg-muted text-muted-foreground border-0", label: "Other" },
    };
    const variant = variants[type] || variants.other;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Group documents by type
  const leaseDocuments = documents.filter((d) => d.document_type === "lease");
  const receiptDocuments = documents.filter((d) => d.document_type === "receipt");
  const otherDocuments = documents.filter((d) => d.document_type !== "lease" && d.document_type !== "receipt");

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm">Your landlord hasn't uploaded any documents</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lease Documents */}
      {leaseDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-success" />
              Lease Documents
            </CardTitle>
            <CardDescription>Your signed lease agreements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaseDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getDocumentIcon(doc.document_type)}
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(doc.created_at), "MMM d, yyyy")} • {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                  >
                    {downloading === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Receipts */}
      {receiptDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Payment Receipts
            </CardTitle>
            <CardDescription>Your payment confirmation documents</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{format(new Date(doc.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        disabled={downloading === doc.id}
                      >
                        {downloading === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Other Documents */}
      {otherDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <File className="h-5 w-5" />
              Other Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{getTypeBadge(doc.document_type)}</TableCell>
                    <TableCell>{format(new Date(doc.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        disabled={downloading === doc.id}
                      >
                        {downloading === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalDocuments;

"use client";

import UploadButton from "@/components/custom/UploadCropperButton";
import type { UploadResult } from "@/components/custom/UploadCropperButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Image as ImageIcon, Loader2, X as XIcon } from "lucide-react";
import React, { useState, useEffect } from "react";

interface ModelFile {
  id: number;
  url: string;
  name: string;
  type: string;
  modelId: number;
  createdAt: Date;
}

interface ModelFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: number;
  modelName: string;
  brandName: string;
  onFilesUpdated: () => void;
}

export function ModelFilesModal({
  isOpen,
  onClose,
  modelId,
  modelName,
  brandName,
  onFilesUpdated,
}: ModelFilesModalProps) {
  const [activeTab, setActiveTab] = useState("images");
  const [files, setFiles] = useState<ModelFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch files when modal opens
  useEffect(() => {
    if (isOpen && modelId) {
      fetchModelFiles();
    }
  }, [isOpen, modelId]);

  const fetchModelFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/models/${modelId}/files`);
      if (!response.ok) {
        // Si el error es 404 (modelo no encontrado), inicializamos con array vacío
        if (response.status === 404) {
          setFiles([]);
          return;
        }
        throw new Error("Error al cargar archivos");
      }
      const data = await response.json();
      setFiles(data.files || []); // Aseguramos que siempre sea un array
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los archivos",
        variant: "destructive",
      });
      // En caso de error, inicializamos con array vacío
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async ({ originalFile }: UploadResult) => {
    try {
      setIsUploading(true);
      console.log("Starting file upload:", {
        modelId,
        brandName,
        fileName: originalFile.name,
        fileType: originalFile.type,
      });

      const formData = new FormData();
      formData.append("file", originalFile);
      formData.append("modelId", modelId.toString());
      formData.append("brandName", brandName);

      const response = await fetch(`/api/models/${modelId}/files`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("File upload failed:", errorData);
        throw new Error(errorData.error || "Error al subir archivo");
      }

      const data = await response.json();
      console.log("File upload successful:", data);

      setFiles((prev) => [...prev, data.file]);
      onFilesUpdated();

      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente",
      });
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDelete = async (fileId: number) => {
    try {
      setIsDeleting(fileId);
      const response = await fetch(`/api/models/${modelId}/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar archivo");

      setFiles((prev) => prev.filter((file) => file.id !== fileId));
      onFilesUpdated();

      toast({
        title: "Archivo eliminado",
        description: "El archivo se ha eliminado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  const pdfFiles = files.filter((file) => file.type === "application/pdf");
  const otherFiles = files.filter(
    (file) => !file.type.startsWith("image/") && file.type !== "application/pdf",
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Archivos del modelo: {modelName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="images">Imágenes</TabsTrigger>
            <TabsTrigger value="specs">Fichas Técnicas</TabsTrigger>
            <TabsTrigger value="others">Otros</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="images" className="py-4">
                <div className="space-y-4">
                  <UploadButton
                    placeholder="Subir imagen"
                    onChange={handleFileUpload}
                    accept="image/*"
                    crop={true}
                    disabled={isUploading}
                  />
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {imageFiles.map((file) => (
                        <div key={file.id} className="relative group rounded-lg overflow-hidden">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-40 object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleFileDelete(file.id)}
                            disabled={isDeleting === file.id}
                          >
                            {isDeleting === file.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="specs" className="py-4">
                <div className="space-y-4">
                  <UploadButton
                    placeholder="Subir ficha técnica (PDF)"
                    onChange={handleFileUpload}
                    accept=".pdf"
                    crop={false}
                    disabled={isUploading}
                  />
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {pdfFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm hover:underline"
                            >
                              {file.name}
                            </a>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleFileDelete(file.id)}
                            disabled={isDeleting === file.id}
                          >
                            {isDeleting === file.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XIcon className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="others" className="py-4">
                <div className="space-y-4">
                  <UploadButton
                    placeholder="Subir archivo"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {otherFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm hover:underline"
                            >
                              {file.name}
                            </a>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleFileDelete(file.id)}
                            disabled={isDeleting === file.id}
                          >
                            {isDeleting === file.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XIcon className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

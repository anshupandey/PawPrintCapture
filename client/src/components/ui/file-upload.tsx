import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  accept?: string;
  maxSize?: number;
}

export default function FileUpload({ onFileSelect, selectedFile, accept = ".pptx", maxSize = 50 * 1024 * 1024 }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    maxSize,
    multiple: false,
  });

  const removeFile = () => {
    onFileSelect(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800">{selectedFile.name}</p>
                <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed cursor-pointer transition-colors",
        isDragActive && !isDragReject && "border-blue-400 bg-blue-50",
        isDragReject && "border-red-400 bg-red-50",
        !isDragActive && "border-gray-300 hover:border-gray-400"
      )}
    >
      <CardContent className="p-8 text-center">
        <input {...getInputProps()} />
        <Upload className={cn(
          "h-12 w-12 mx-auto mb-4",
          isDragActive && !isDragReject && "text-blue-500",
          isDragReject && "text-red-500",
          !isDragActive && "text-gray-400"
        )} />
        
        {isDragReject ? (
          <div>
            <p className="text-red-600 font-medium mb-2">Invalid file type</p>
            <p className="text-sm text-red-500">Please upload a PowerPoint file (.pptx)</p>
          </div>
        ) : isDragActive ? (
          <div>
            <p className="text-blue-600 font-medium mb-2">Drop your PowerPoint here</p>
            <p className="text-sm text-blue-500">Release to upload</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 font-medium mb-2">Drag & drop your PowerPoint file here</p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <Button variant="outline" type="button">
              Select File
            </Button>
            <p className="text-xs text-gray-400 mt-4">
              Supports .pptx files up to {formatFileSize(maxSize)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

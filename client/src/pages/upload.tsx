import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadRequestSchema, type UploadRequest, type ProcessingJob } from "@shared/schema";
import FileUpload from "@/components/ui/file-upload";
import ApiKeyForm from "@/components/ui/api-key-form";
import ProgressTracker from "@/components/ui/progress-tracker";
import { Download, Play, FileText, Video, FileImage } from "lucide-react";

export default function Upload() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showCompletedJob, setShowCompletedJob] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<UploadRequest>({
    resolver: zodResolver(uploadRequestSchema),
    defaultValues: {
      openai_api_key: "",
      google_tts_api_key: "",
      elevenlabs_api_key: "",
      tts_provider: "openai",
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.75,
      },
    },
  });

  // Poll for job status
  const { data: job, isLoading: isJobLoading } = useQuery<ProcessingJob>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
    refetchInterval: jobId && !["completed", "error"].includes(
      queryClient.getQueryData<ProcessingJob>(["/api/jobs", jobId])?.status || ""
    ) ? 2000 : false,
  });

  // Query for completed job to show downloads
  const { data: completedJob } = useQuery<ProcessingJob>({
    queryKey: ["/api/jobs", showCompletedJob],
    enabled: !!showCompletedJob,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadRequest & { file: File }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("openai_api_key", data.openai_api_key);
      formData.append("tts_provider", data.tts_provider);
      
      if (data.google_tts_api_key) {
        formData.append("google_tts_api_key", data.google_tts_api_key);
      }
      if (data.elevenlabs_api_key) {
        formData.append("elevenlabs_api_key", data.elevenlabs_api_key);
      }
      if (data.voice_settings) {
        formData.append("voice_settings", JSON.stringify(data.voice_settings));
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setJobId(data.job_id);
      toast({
        title: "Upload successful",
        description: "Your PowerPoint is being processed. This may take several minutes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UploadRequest) => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PowerPoint file to upload.",
        variant: "destructive",
      });
      return;
    }

    // Validate API key for selected provider
    const requiredKey = data.tts_provider === "openai" ? data.openai_api_key :
                       data.tts_provider === "google" ? data.google_tts_api_key :
                       data.elevenlabs_api_key;

    if (!requiredKey) {
      toast({
        title: "Missing API key",
        description: `Please provide an API key for ${data.tts_provider}.`,
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ ...data, file: uploadedFile });
  };

  const downloadFile = (filePath: string, filename: string) => {
    // Extract job ID and file type from the file path
    const pathParts = filePath.split('/');
    const jobIdFromPath = pathParts[1]; // outputs/jobId/filename
    const actualFilename = pathParts[2];
    
    let fileType = '';
    if (actualFilename.includes('narrated_presentation')) fileType = 'narrated_pptx';
    else if (actualFilename.includes('learning_module')) fileType = 'video_mp4';  
    else if (actualFilename.includes('original_presentation')) fileType = 'pdf';
    else if (actualFilename.includes('transcripts')) fileType = 'transcripts_json';
    
    const downloadUrl = `/api/download/${jobIdFromPath}/${fileType}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setJobId(null);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PowerPoint to Learning Module Converter
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your PowerPoint presentations into narrated self-learning modules with AI-generated 
            transcripts and synchronized audio. Perfect for creating engaging educational content.
          </p>
        </div>

        {/* Completed Job Downloads Section */}
        {completedJob?.status === "completed" && completedJob.output_files && (
          <Card className="shadow-lg border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Download className="h-6 w-6" />
                Previous Job Completed - Download Available
              </CardTitle>
              <CardDescription className="text-green-700">
                Your previous PowerPoint conversion is ready! Download your files below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedJob.output_files.narrated_pptx && (
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-green-300 hover:bg-green-100"
                    onClick={() => downloadFile(completedJob.output_files!.narrated_pptx!, "narrated_presentation.pptx")}
                  >
                    <FileText className="h-8 w-8 text-green-600" />
                    <span className="font-medium">Narrated PowerPoint</span>
                    <span className="text-sm text-gray-600">PPTX with embedded audio</span>
                  </Button>
                )}

                {completedJob.output_files.video_mp4 && (
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-green-300 hover:bg-green-100"
                    onClick={() => downloadFile(completedJob.output_files!.video_mp4!, "learning_module.mp4")}
                  >
                    <Video className="h-8 w-8 text-green-600" />
                    <span className="font-medium">Video Module</span>
                    <span className="text-sm text-gray-600">MP4 with synchronized audio</span>
                  </Button>
                )}

                {completedJob.output_files.pdf && (
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-green-300 hover:bg-green-100"
                    onClick={() => downloadFile(completedJob.output_files!.pdf!, "original_presentation.pdf")}
                  >
                    <FileImage className="h-8 w-8 text-green-600" />
                    <span className="font-medium">PDF Reference</span>
                    <span className="text-sm text-gray-600">Original slides as PDF</span>
                  </Button>
                )}

                {completedJob.output_files.transcripts_json && (
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-green-300 hover:bg-green-100"
                    onClick={() => downloadFile(completedJob.output_files!.transcripts_json!, "transcripts.json")}
                  >
                    <FileText className="h-8 w-8 text-green-600" />
                    <span className="font-medium">Transcripts</span>
                    <span className="text-sm text-gray-600">Generated narration text</span>
                  </Button>
                )}
              </div>
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCompletedJob(null)}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Hide Downloads
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!jobId ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Upload & Configure
              </CardTitle>
              <CardDescription>
                Upload your PowerPoint file and configure your preferred text-to-speech settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                onFileSelect={setUploadedFile}
                selectedFile={uploadedFile}
                accept=".pptx"
                maxSize={50 * 1024 * 1024} // 50MB
              />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <ApiKeyForm form={form} />
                  
                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetUpload}
                      disabled={uploadMutation.isPending}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={!uploadedFile || uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? "Processing..." : "Start Conversion"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <ProgressTracker job={job} isLoading={isJobLoading} />
            
            {job?.status === "completed" && job.output_files && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-6 w-6" />
                    Download Results
                  </CardTitle>
                  <CardDescription>
                    Your learning module has been created successfully. Download the files below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {job.output_files.narrated_pptx && (
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2"
                        onClick={() => downloadFile(job.output_files!.narrated_pptx!, "narrated_presentation.pptx")}
                      >
                        <FileText className="h-8 w-8" />
                        <span className="font-medium">Narrated PowerPoint</span>
                        <span className="text-sm text-gray-500">PPTX with embedded audio</span>
                      </Button>
                    )}

                    {job.output_files.video_mp4 && (
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2"
                        onClick={() => downloadFile(job.output_files!.video_mp4!, "learning_module.mp4")}
                      >
                        <Video className="h-8 w-8" />
                        <span className="font-medium">Video Module</span>
                        <span className="text-sm text-gray-500">MP4 with synchronized audio</span>
                      </Button>
                    )}

                    {job.output_files.pdf && (
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2"
                        onClick={() => downloadFile(job.output_files!.pdf!, "original_presentation.pdf")}
                      >
                        <FileImage className="h-8 w-8" />
                        <span className="font-medium">PDF Reference</span>
                        <span className="text-sm text-gray-500">Original slides as PDF</span>
                      </Button>
                    )}

                    {job.output_files.transcripts_json && (
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2"
                        onClick={() => downloadFile(job.output_files!.transcripts_json!, "transcripts.json")}
                      >
                        <FileText className="h-8 w-8" />
                        <span className="font-medium">Transcripts</span>
                        <span className="text-sm text-gray-500">Generated narration text</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-center pt-4">
                    <Button onClick={resetUpload}>
                      Create Another Module
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {job?.status === "error" && (
              <Card className="shadow-lg border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Processing Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-600 mb-4">{job.error_message}</p>
                  <Button onClick={resetUpload} variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

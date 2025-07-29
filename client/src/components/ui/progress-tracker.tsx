import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import type { ProcessingJob } from "@shared/schema";

interface ProgressTrackerProps {
  job: ProcessingJob | undefined;
  isLoading: boolean;
}

const statusSteps = [
  { key: 'extracting', label: 'Extracting Content', description: 'Reading slides and extracting text and images' },
  { key: 'generating_transcript', label: 'Generating Transcript', description: 'Creating educational narration with AI' },
  { key: 'refining_transcript', label: 'Refining Content', description: 'Improving clarity and instructional design' },
  { key: 'synthesizing_audio', label: 'Synthesizing Audio', description: 'Converting text to natural speech' },
  { key: 'embedding_audio', label: 'Embedding Audio', description: 'Adding audio to PowerPoint slides' },
  { key: 'converting_pdf', label: 'Converting to PDF', description: 'Creating PDF reference version' },
  { key: 'rendering_video', label: 'Rendering Video', description: 'Creating synchronized MP4 video' },
];

export default function ProgressTracker({ job, isLoading }: ProgressTrackerProps) {
  if (isLoading || !job) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === job.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  const getStepStatus = (index: number) => {
    if (job.status === 'error') return 'error';
    if (job.status === 'completed') return 'completed';
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'current':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (job.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Processing</Badge>;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Processing: {job.filename}</span>
          {getStatusBadge()}
        </CardTitle>
        <div className="space-y-2">
          <Progress value={job.progress} className="w-full" />
          <p className="text-sm text-gray-600">{job.progress}% complete</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusSteps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <div
                key={step.key}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  status === 'current' ? 'bg-blue-50 border border-blue-200' :
                  status === 'completed' ? 'bg-green-50' :
                  status === 'error' ? 'bg-red-50' :
                  'bg-gray-50'
                }`}
              >
                {getStatusIcon(status)}
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    status === 'current' ? 'text-blue-900' :
                    status === 'completed' ? 'text-green-900' :
                    status === 'error' ? 'text-red-900' :
                    'text-gray-600'
                  }`}>
                    {step.label}
                  </h4>
                  <p className={`text-sm ${
                    status === 'current' ? 'text-blue-700' :
                    status === 'completed' ? 'text-green-700' :
                    status === 'error' ? 'text-red-700' :
                    'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {job.status === 'error' && job.error_message && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Error Details</h4>
            <p className="text-sm text-red-700">{job.error_message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

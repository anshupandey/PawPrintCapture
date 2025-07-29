import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UploadRequest } from "@shared/schema";

interface ApiKeyFormProps {
  form: UseFormReturn<UploadRequest>;
}

export default function ApiKeyForm({ form }: ApiKeyFormProps) {
  const [showKeys, setShowKeys] = useState({
    openai: false,
    google: false,
    elevenlabs: false,
  });

  const watchTtsProvider = form.watch("tts_provider");

  const toggleKeyVisibility = (provider: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API Configuration
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Your API keys are used only for this session and are not stored on our servers.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="openai_api_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OpenAI API Key *</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showKeys.openai ? "text" : "password"}
                      placeholder="sk-..."
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => toggleKeyVisibility('openai')}
                  >
                    {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FormDescription>
                  Required for AI transcript generation. Get your key from OpenAI's platform.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Text-to-Speech Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="tts_provider"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="openai" id="openai" />
                      <Label htmlFor="openai" className="cursor-pointer">
                        <div>
                          <p className="font-medium">OpenAI TTS</p>
                          <p className="text-sm text-gray-500">High quality, natural voices</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="google" id="google" />
                      <Label htmlFor="google" className="cursor-pointer">
                        <div>
                          <p className="font-medium">Google Cloud TTS</p>
                          <p className="text-sm text-gray-500">Wide language support</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="elevenlabs" id="elevenlabs" />
                      <Label htmlFor="elevenlabs" className="cursor-pointer">
                        <div>
                          <p className="font-medium">ElevenLabs</p>
                          <p className="text-sm text-gray-500">Premium AI voices</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchTtsProvider === "google" && (
            <FormField
              control={form.control}
              name="google_tts_api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Cloud TTS API Key</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showKeys.google ? "text" : "password"}
                        placeholder="Enter your Google Cloud API key"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleKeyVisibility('google')}
                    >
                      {showKeys.google ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormDescription>
                    Required for Google Cloud TTS. Enable the Text-to-Speech API in your Google Cloud project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {watchTtsProvider === "elevenlabs" && (
            <>
              <FormField
                control={form.control}
                name="elevenlabs_api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ElevenLabs API Key</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showKeys.elevenlabs ? "text" : "password"}
                          placeholder="Enter your ElevenLabs API key"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => toggleKeyVisibility('elevenlabs')}
                      >
                        {showKeys.elevenlabs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormDescription>
                      Required for ElevenLabs TTS. Get your key from the ElevenLabs platform.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="voice_settings.stability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice Stability: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          value={[field.value || 0.75]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Higher values make the voice more stable and consistent.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="voice_settings.similarity_boost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Similarity Boost: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          value={[field.value || 0.75]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Enhances the similarity to the original voice.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

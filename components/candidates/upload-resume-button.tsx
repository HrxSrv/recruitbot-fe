"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResumeUploadWizard } from "./resume-upload-wizard"

interface UploadResumeButtonProps {
  onUploadComplete?: () => void
}

export function UploadResumeButton({ onUploadComplete }: UploadResumeButtonProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setUploadDialogOpen(true)}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload Resume
      </Button>

      <ResumeUploadWizard
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={onUploadComplete}
        mode="general"
      />
    </>
  )
}

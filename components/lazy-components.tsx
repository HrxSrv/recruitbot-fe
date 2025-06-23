import { lazy } from "react"

// Lazy load heavy dialogs and components
export const BulkUploadDialog = lazy(() =>
  import("@/components/candidates/bulk-upload-resumes").then((module) => ({
    default: module.BulkUploadDialog,
  })),
)

export const CreateJobDialog = lazy(() =>
  import("@/components/jobs/create-job-dialog").then((module) => ({
    default: module.CreateJobDialog,
  })),
)

export const CreateAssistantDialog = lazy(() =>
  import("@/components/assistants/create-assistant-dialog").then((module) => ({
    default: module.CreateAssistantDialog,
  })),
)

export const CandidateScoresDialog = lazy(() =>
  import("@/components/candidates/candidate-scores-dialog").then((module) => ({
    default: module.CandidateScoresDialog,
  })),
)

export const CallAnalysisDialog = lazy(() =>
  import("@/components/candidates/call-analysis-dialog").then((module) => ({
    default: module.CallAnalysisDialog,
  })),
)

export const JobAssociationDialog = lazy(() =>
  import("@/components/candidates/job-association-dialog").then((module) => ({
    default: module.JobAssociationDialog,
  })),
)

export const ScheduleCallDialog = lazy(() =>
  import("@/components/candidates/schedule-call-dialog").then((module) => ({
    default: module.ScheduleCallDialog,
  })),
)

export const QuickScheduleDialog = lazy(() =>
  import("@/components/jobs/quick-schedule-dialog").then((module) => ({
    default: module.QuickScheduleDialog,
  })),
)

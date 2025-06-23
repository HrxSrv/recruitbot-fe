import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function CandidateCardSkeleton() {
  return (
    <Card className="group relative border border-slate-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Left Section - Avatar and Basic Info */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="relative">
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-56" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>

          {/* Center Section - Overall Score */}
          <div className="flex-1 flex justify-center items-center px-6 border-x border-slate-100">
            <div className="text-center">
              <div className="px-4 py-3 rounded-lg border bg-gray-50">
                <div className="flex flex-col items-center gap-1.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Application Status */}
          <div className="flex flex-col justify-center items-end gap-4 flex-shrink-0 min-w-[200px]">
            <div className="flex flex-wrap gap-1.5 justify-end max-w-[180px]">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CandidateListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <CandidateCardSkeleton key={i} />
      ))}
    </div>
  )
}

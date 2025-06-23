import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function JobCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden border-border/60">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16 ml-2 rounded-full" />
        </div>

        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20 ml-2" />
        </div>

        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>

        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  )
}

export function JobTableRowSkeleton() {
  return (
    <tr className="hover:bg-muted/30">
      <td className="p-4">
        <Skeleton className="h-4 w-40" />
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
    </tr>
  )
}

export function JobGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function JobTableSkeleton() {
  return (
    <div className="overflow-auto rounded-md border border-border/50">
      <table className="w-full">
        <thead className="bg-muted/30">
          <tr>
            <th className="p-4 text-left font-medium">Job Title</th>
            <th className="p-4 text-left font-medium">Status</th>
            <th className="p-4 text-left font-medium">Location</th>
            <th className="p-4 text-left font-medium">Type</th>
            <th className="p-4 text-left font-medium">Language</th>
            <th className="p-4 text-left font-medium">Posted</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <JobTableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

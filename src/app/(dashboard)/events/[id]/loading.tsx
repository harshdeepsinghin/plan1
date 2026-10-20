import { Skeleton } from "@/components/ui/skeleton"

export default function EventLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border p-6 sm:p-8">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-4 h-10 w-2/3 max-w-lg" />
        <div className="mt-4 flex flex-wrap gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-4 h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

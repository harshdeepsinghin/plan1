import { Skeleton } from "@/components/ui/skeleton"

export default function NewEventLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="rounded-2xl border p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-16 sm:col-span-2" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16 sm:col-span-2" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    </div>
  )
}

import { DashboardHeader } from "@/components/layout/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="py-6 px-4 lg:px-6">{children}</main>
    </div>
  )
}

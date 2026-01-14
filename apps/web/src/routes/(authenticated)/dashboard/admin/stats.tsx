import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'

export const Route = createFileRoute('/(authenticated)/dashboard/admin/stats')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AnalyticsDashboard />
}

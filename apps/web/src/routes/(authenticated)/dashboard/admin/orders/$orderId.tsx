import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/dashboard/admin/orders/$orderId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/admin/orders/$orderId"!</div>
}

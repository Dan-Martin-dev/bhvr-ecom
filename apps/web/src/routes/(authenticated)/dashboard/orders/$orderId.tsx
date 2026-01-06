import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/dashboard/orders/$orderId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/orders/$orderId"!</div>
}

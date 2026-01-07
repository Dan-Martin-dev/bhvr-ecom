import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/(authenticated)/dashboard/admin/customers/$customerId',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>Hello "/(authenticated)/dashboard/admin/customers/$customerId"!</div>
  )
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/(authenticated)/dashboard/admin/products/create',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(authenticated)/dashboard/admin/products/create"!</div>
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/(authenticated)/dashboard/admin/products/',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(authenticated)/dashboard/admin/products/"!</div>
}

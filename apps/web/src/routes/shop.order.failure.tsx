import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/shop/order/failure')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/shop/order/failure"!</div>
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/shop/order/success')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/shop/order/success"!</div>
}

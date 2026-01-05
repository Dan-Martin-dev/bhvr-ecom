import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/shop/order/pending')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/shop/order/pending"!</div>
}

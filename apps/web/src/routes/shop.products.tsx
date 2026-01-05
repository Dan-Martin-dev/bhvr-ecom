import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/shop/products')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/shop/products"!</div>
}

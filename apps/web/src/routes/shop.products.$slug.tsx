import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/shop/products/$slug')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/shop/products/$slug"!</div>
}

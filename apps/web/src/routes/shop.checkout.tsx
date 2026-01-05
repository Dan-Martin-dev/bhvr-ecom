import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/shop/checkout')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/shop/checkout"!</div>
}

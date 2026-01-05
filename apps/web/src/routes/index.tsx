import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Package, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-12">
        <pre className="overflow-x-auto font-mono text-xs">{TITLE_TEXT}</pre>
        <div className="mt-8 text-center">
          <h1 className="mb-4 text-4xl font-bold">
            High-Performance E-Commerce Boilerplate
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Built on the modern BHVR stack (Bun, Hono, Vite, Redis/PostgreSQL).
            Self-hosted, type-safe, and blazing fast.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/shop/products">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse Products
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/dashboard">View Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>High Performance</CardTitle>
            <CardDescription>
              Bun runtime + Hono framework = sub-10ms API responses
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Self-Hosted</CardTitle>
            <CardDescription>
              Complete data sovereignty. Deploy anywhere, own your data.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Clean Architecture</CardTitle>
            <CardDescription>
              Maintainable, testable, scalable codebase with TypeScript.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Ready to Use</CardTitle>
            <CardDescription>
              Full e-commerce features: products, cart, orders, payments.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
            <CardDescription>
              Modern tools for modern applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h4 className="mb-1 font-semibold">Runtime & Backend</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Bun (Runtime)</li>
                  <li>• Hono (Web Framework)</li>
                  <li>• Better Auth (Authentication)</li>
                </ul>
              </div>
              <div>
                <h4 className="mb-1 font-semibold">Frontend</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• React 19</li>
                  <li>• TanStack Router</li>
                  <li>• Tailwind CSS 4</li>
                  <li>• shadcn/ui</li>
                </ul>
              </div>
              <div>
                <h4 className="mb-1 font-semibold">Data & Infrastructure</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• PostgreSQL</li>
                  <li>• Redis</li>
                  <li>• Drizzle ORM</li>
                  <li>• Docker</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

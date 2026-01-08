import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { checkoutApi, cartApi, type Address } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShoppingCart, MapPin, Truck, CreditCard, Loader2 } from "lucide-react";

export const Route = createFileRoute("/(shop)/checkout")({
  component: CheckoutPage,
});

interface Cart {
  id: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    priceAtAdd: number;
    product: {
      name: string;
      price: number;
      weight?: number;
    };
  }>;
  subtotal: number;
  total: number;
}

type CheckoutStep = "shipping" | "payment" | "review";

function CheckoutPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("shipping");
  const [shippingAddress, setShippingAddress] = useState<Address>({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "AR",
    phone: "",
  });
  const [shippingZone, setShippingZone] = useState<"amba" | "interior" | "pickup">("amba");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");

  // Fetch cart
  const { data: cart, isLoading: isLoadingCart } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: async () => {
      return await cartApi.get();
    },
  });

  // Calculate shipping cost based on zone
  const calculateShippingCost = (zone: string): number => {
    const costs = {
      amba: 50000, // $500 ARS
      interior: 100000, // $1000 ARS
      pickup: 0, // Free
    };
    return costs[zone as keyof typeof costs] || 100000;
  };

  const shippingCost = calculateShippingCost(shippingZone);
  const total = (cart?.subtotal || 0) + shippingCost;

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!cart?.id) throw new Error("Cart not found");
      return await checkoutApi.createPayment({
        cartId: cart.id,
        shippingAddress,
        billingAddress: shippingAddress, // Same as shipping for now
        shippingZone,
        notes: notes || undefined,
        couponCode: couponCode || undefined,
      });
    },
    onSuccess: (data) => {
      // Redirect to Mercado Pago
      if (data.initPoint) {
        window.location.href = data.initPoint;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate shipping address
    if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.address1 || 
        !shippingAddress.city || !shippingAddress.province || !shippingAddress.postalCode || !shippingAddress.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCurrentStep("payment");
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep("review");
  };

  const handlePlaceOrder = () => {
    if (!cart?.id) {
      toast.error("Cart not found");
      return;
    }
    createOrderMutation.mutate();
  };

  if (isLoadingCart) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container py-12 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">
          Add some products to your cart before checking out
        </p>
        <Button onClick={() => navigate({ to: "/products" })}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8 gap-4">
        <div className={`flex items-center gap-2 ${currentStep === "shipping" ? "text-primary" : currentStep === "payment" || currentStep === "review" ? "text-muted-foreground" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === "shipping" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
            1
          </div>
          <span className="font-medium">Shipping</span>
        </div>
        <div className="w-12 h-0.5 bg-muted-foreground" />
        <div className={`flex items-center gap-2 ${currentStep === "payment" ? "text-primary" : currentStep === "review" ? "text-muted-foreground" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === "payment" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
            2
          </div>
          <span className="font-medium">Payment</span>
        </div>
        <div className="w-12 h-0.5 bg-muted-foreground" />
        <div className={`flex items-center gap-2 ${currentStep === "review" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === "review" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
            3
          </div>
          <span className="font-medium">Review</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Information */}
          {currentStep === "shipping" && (
            <form onSubmit={handleShippingSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Information
                  </CardTitle>
                  <CardDescription>
                    Enter your delivery address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={shippingAddress.firstName}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, firstName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={shippingAddress.lastName}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address1">Address *</Label>
                    <Input
                      id="address1"
                      value={shippingAddress.address1}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, address1: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address2">Apartment, suite, etc. (optional)</Label>
                    <Input
                      id="address2"
                      value={shippingAddress.address2}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, address2: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, city: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province">Province *</Label>
                      <Input
                        id="province"
                        value={shippingAddress.province}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, province: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        value={shippingAddress.postalCode}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={shippingAddress.phone}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, phone: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Method
                    </Label>
                    <RadioGroup value={shippingZone} onValueChange={(value: string) => setShippingZone(value as "amba" | "interior" | "pickup")}>
                      <div className="flex items-center space-x-2 border rounded-lg p-4">
                        <RadioGroupItem value="amba" id="amba" />
                        <Label htmlFor="amba" className="flex-1 cursor-pointer">
                          <div className="font-medium">AMBA (Buenos Aires Metro Area)</div>
                          <div className="text-sm text-muted-foreground">3-5 business days</div>
                        </Label>
                        <div className="font-medium">$500</div>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-4">
                        <RadioGroupItem value="interior" id="interior" />
                        <Label htmlFor="interior" className="flex-1 cursor-pointer">
                          <div className="font-medium">Interior (Rest of Argentina)</div>
                          <div className="text-sm text-muted-foreground">5-10 business days</div>
                        </Label>
                        <div className="font-medium">$1,000</div>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-4">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                          <div className="font-medium">Store Pickup</div>
                          <div className="text-sm text-muted-foreground">Available in 1-2 days</div>
                        </Label>
                        <div className="font-medium">FREE</div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                      placeholder="Special instructions for delivery..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            </form>
          )}

          {/* Payment Method */}
          {currentStep === "payment" && (
            <form onSubmit={handlePaymentSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                  <CardDescription>
                    Select how you'd like to pay
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-6 bg-muted/50">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="h-8 w-8" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 472c-119.1 0-216-96.9-216-216S136.9 40 256 40s216 96.9 216 216-96.9 216-216 216z"/>
                      </svg>
                      <div>
                        <div className="font-semibold">Mercado Pago</div>
                        <div className="text-sm text-muted-foreground">
                          Credit/debit cards, cash, and bank transfers
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      You will be redirected to Mercado Pago to complete your payment securely.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coupon">Coupon Code (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="coupon"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                      />
                      <Button type="button" variant="outline">
                        Apply
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep("shipping")}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Review Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

          {/* Review & Place Order */}
          {currentStep === "review" && (
            <Card>
              <CardHeader>
                <CardTitle>Review Your Order</CardTitle>
                <CardDescription>
                  Please review your order before placing it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shipping Address */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
                    <p>{shippingAddress.address1}</p>
                    {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                    <p>{shippingAddress.city}, {shippingAddress.province} {shippingAddress.postalCode}</p>
                    <p>{shippingAddress.phone}</p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => setCurrentStep("shipping")}
                  >
                    Edit
                  </Button>
                </div>

                <Separator />

                {/* Shipping Method */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Shipping Method
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {shippingZone === "amba" && "AMBA (Buenos Aires Metro Area) - 3-5 business days"}
                    {shippingZone === "interior" && "Interior (Rest of Argentina) - 5-10 business days"}
                    {shippingZone === "pickup" && "Store Pickup - Available in 1-2 days"}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => setCurrentStep("shipping")}
                  >
                    Edit
                  </Button>
                </div>

                <Separator />

                {/* Payment Method */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Method
                  </h3>
                  <div className="text-sm text-muted-foreground">Mercado Pago</div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => setCurrentStep("payment")}
                  >
                    Edit
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("payment")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={createOrderMutation.isPending}
                    className="flex-1"
                    size="lg"
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Place Order"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-muted-foreground">Qty: {item.quantity}</div>
                    </div>
                    <div className="font-medium">
                      ${((item.priceAtAdd * item.quantity) / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${(cart.subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? "FREE" : `$${(shippingCost / 100).toFixed(2)}`}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

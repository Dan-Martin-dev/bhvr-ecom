import { db } from "@bhvr-ecom/db";
import { shippingMethod } from "@bhvr-ecom/db/schema/ecommerce";
import { eq, and, asc, desc } from "drizzle-orm";
import type {
  CreateShippingMethodInput,
  UpdateShippingMethodInput,
  GetShippingMethodsInput,
  CalculateShippingInput,
  ShippingZone,
} from "@bhvr-ecom/validations";

// ============================================================================
// CREATE SHIPPING METHOD
// ============================================================================

export async function createShippingMethod(input: CreateShippingMethodInput) {
  const [created] = await db
    .insert(shippingMethod)
    .values({
      name: input.name,
      description: input.description,
      baseCost: input.baseCost,
      costPerKg: input.costPerKg,
      zones: input.zones,
      minDeliveryDays: input.minDeliveryDays,
      maxDeliveryDays: input.maxDeliveryDays,
      freeShippingThreshold: input.freeShippingThreshold,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    })
    .returning();

  return created;
}

// ============================================================================
// UPDATE SHIPPING METHOD
// ============================================================================

export async function updateShippingMethod(input: UpdateShippingMethodInput) {
  const { id, ...updateData } = input;

  // Remove undefined fields
  const cleanedData = Object.fromEntries(
    Object.entries(updateData).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(cleanedData).length === 0) {
    throw new Error("No fields to update");
  }

  const [updated] = await db
    .update(shippingMethod)
    .set(cleanedData)
    .where(eq(shippingMethod.id, id))
    .returning();

  if (!updated) {
    throw new Error("Shipping method not found");
  }

  return updated;
}

// ============================================================================
// DELETE SHIPPING METHOD
// ============================================================================

export async function deleteShippingMethod(id: string) {
  const [deleted] = await db
    .delete(shippingMethod)
    .where(eq(shippingMethod.id, id))
    .returning();

  if (!deleted) {
    throw new Error("Shipping method not found");
  }

  return { success: true };
}

// ============================================================================
// GET SHIPPING METHOD BY ID
// ============================================================================

export async function getShippingMethodById(id: string) {
  const method = await db.query.shippingMethod.findFirst({
    where: eq(shippingMethod.id, id),
  });

  if (!method) {
    throw new Error("Shipping method not found");
  }

  return method;
}

// ============================================================================
// GET SHIPPING METHODS
// ============================================================================

export async function getShippingMethods(input?: GetShippingMethodsInput) {
  const {
    zone,
    isActive,
    sortBy = "sortOrder",
    sortOrder: order = "asc",
  } = input || {};

  const conditions = [];

  if (isActive !== undefined) {
    conditions.push(eq(shippingMethod.isActive, isActive));
  }

  // Build query
  let query = db.select().from(shippingMethod);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  // Apply sorting
  if (sortBy === "sortOrder") {
    query = query.orderBy(order === "asc" ? asc(shippingMethod.sortOrder) : desc(shippingMethod.sortOrder)) as typeof query;
  } else if (sortBy === "name") {
    query = query.orderBy(order === "asc" ? asc(shippingMethod.name) : desc(shippingMethod.name)) as typeof query;
  } else if (sortBy === "baseCost") {
    query = query.orderBy(order === "asc" ? asc(shippingMethod.baseCost) : desc(shippingMethod.baseCost)) as typeof query;
  }

  const methods = await query;

  // Filter by zone if specified (zones is an array column)
  if (zone) {
    return methods.filter((method) => method.zones.includes(zone));
  }

  return methods;
}

// ============================================================================
// CALCULATE SHIPPING COST
// ============================================================================

export async function calculateShippingCost(input: CalculateShippingInput) {
  const { shippingMethodId, cartTotal, weight = 0, zone } = input;

  const method = await getShippingMethodById(shippingMethodId);

  if (!method.isActive) {
    throw new Error("Shipping method is not active");
  }

  // Check if zone is supported
  if (!method.zones.includes(zone)) {
    throw new Error("Shipping method not available for this zone");
  }

  // Check for free shipping
  if (
    method.freeShippingThreshold &&
    cartTotal >= method.freeShippingThreshold
  ) {
    return {
      cost: 0,
      isFree: true,
      methodName: method.name,
      estimatedDays: `${method.minDeliveryDays}-${method.maxDeliveryDays}`,
    };
  }

  // Calculate cost: base cost + weight-based cost
  const cost = method.baseCost + Math.round(weight * method.costPerKg);

  return {
    cost,
    isFree: false,
    methodName: method.name,
    estimatedDays: `${method.minDeliveryDays}-${method.maxDeliveryDays}`,
  };
}

// ============================================================================
// GET AVAILABLE SHIPPING METHODS FOR ZONE
// ============================================================================

export async function getAvailableShippingMethods(zone: ShippingZone, cartTotal: number) {
  const activeMethods = await getShippingMethods({ 
    isActive: true, 
    sortBy: "sortOrder", 
    sortOrder: "asc" 
  });

  // Filter methods available for the zone
  const availableMethods = activeMethods.filter((method) =>
    method.zones.includes(zone)
  );

  // Calculate cost for each method
  const methodsWithCost = availableMethods.map((method) => {
    const isFree =
      method.freeShippingThreshold !== null &&
      method.freeShippingThreshold !== undefined &&
      cartTotal >= method.freeShippingThreshold;

    const cost = isFree ? 0 : method.baseCost;

    return {
      id: method.id,
      name: method.name,
      description: method.description,
      cost,
      isFree,
      estimatedDays: `${method.minDeliveryDays}-${method.maxDeliveryDays}`,
      minDeliveryDays: method.minDeliveryDays,
      maxDeliveryDays: method.maxDeliveryDays,
    };
  });

  return methodsWithCost;
}

import { Hono } from "hono";
import type { AppEnv } from "../types";

const categories = new Hono<AppEnv>()
  .get("/", async (c) => {
    // TODO: Implement categories once they exist in core package
    return c.json([]);
  });

export default categories;

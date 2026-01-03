import { Hono } from "hono";

const categories = new Hono()
  .get("/", async (c) => {
    // TODO: Implement categories once they exist in core package
    return c.json([]);
  });

export default categories;

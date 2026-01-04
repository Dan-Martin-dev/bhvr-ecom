import { auth } from "@bhvr-ecom/auth";

export type Bindings = {
  // Add any bindings here
};

export type Variables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };

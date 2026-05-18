import { envSchema } from "./env.schema";

export default () => {
  const parsed = envSchema.parse(process.env);
  return {
    app: parsed,
  };
};

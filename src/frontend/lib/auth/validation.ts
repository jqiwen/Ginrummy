import { z } from "zod";

const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email.");

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, "Please enter your password."),
});

export const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be between 3 and 20 characters.")
      .max(20, "Username must be between 3 and 20 characters.")
      .regex(/^[A-Za-z0-9_]+$/, "Use only letters, numbers, and underscores.")
      .transform((value) => value.toLowerCase()),
    email: normalizedEmail,
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type LoginFormValues = z.input<typeof loginSchema>;
export type SignupFormValues = z.input<typeof signupSchema>;

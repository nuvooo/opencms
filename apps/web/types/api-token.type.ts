import { z } from 'zod';

export const ApiTokenSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string(),
    lastChars: z.string(),
    createdAt: z.string(),
    expiresAt: z.string().nullable().optional(),
    token: z.string().optional(),
  }),
});

export const GetApiTokensSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      lastChars: z.string(),
      createdAt: z.string(),
      expiresAt: z.string().nullable().optional(),
    }),
  ),
});

export type ApiToken = {
  id: string;
  name: string;
  lastChars: string;
  createdAt: string;
  expiresAt?: string | null;
  token?: string;
};

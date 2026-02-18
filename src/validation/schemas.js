import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectId = z.string().regex(objectIdRegex, "Invalid ObjectId");

const optionalString = z.string().trim().min(1, "Must not be empty").optional();

const requiredString = z.string().trim().min(1, "Must not be empty");

const postalCode = z.preprocess(value => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number().int().optional());

const ticketStatuses = ["open", "in-progress", "resolved", "closed"];

const ticketStatusFilter = z.preprocess(
  value => {
    if (value === undefined || value === null || value === "") return undefined;
    const values = Array.isArray(value) ? value : [value];
    const flattened = values.flatMap(item => String(item).split(","));
    const normalized = flattened.map(item => item.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
  },
  z.array(z.enum(ticketStatuses)).optional()
);

const ticketScopeFilter = z.enum(["all", "mine", "assignedToMe"]).optional();

const ticketDateFilter = z.enum(["today"]).optional();

export const authRegisterDto = z
  .object({
    email: requiredString.email(),
    password: z.string().min(6),
    name: requiredString,
  })
  .strict();

export const authLoginDto = z.object({
  email: requiredString.email(),
  password: z.string().min(1),
});

export const ticketIdParamDto = z.object({
  ticketId: objectId,
});

export const ticketCreateDto = z.object({
  title: requiredString,
  description: requiredString,
});

export const ticketCommentDto = z.object({
  content: requiredString,
});

export const ticketUpdateDto = z.object({
  status: z.enum(["open", "in-progress", "resolved", "closed"]).optional(),
  assignedTo: objectId.optional(),
  title: optionalString,
  description: optionalString,
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z
    .enum(["Hardware", "Software", "Network", "Account", "Email", "Other"])
    .optional(),
});

export const ticketTriageDto = z.object({
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z
    .enum(["Hardware", "Software", "Network", "Account", "Email", "Other"])
    .optional(),
  status: z.enum(["open", "in-progress", "resolved", "closed"]).optional(),
  assignedTo: objectId.optional(),
});

export const ticketListDto = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  scope: ticketScopeFilter,
  status: ticketStatusFilter,
  date: ticketDateFilter,
  includeUnassigned: z.coerce.boolean().optional(),
});

export const userIdParamDto = z.object({
  userId: objectId,
});

export const userProfileUpdateDto = z.object({
  name: optionalString,
  company: optionalString,
  department: optionalString,
  position: optionalString,
  manager: objectId.optional(),
  country: optionalString,
  city: optionalString,
  address: optionalString,
  postalCode,
});

export const solutionIdParamDto = z.object({
  id: objectId,
});

export const solutionCreateDto = z.object({
  title: requiredString,
  problem: requiredString,
  solution: requiredString,
  keywords: z.array(z.string().trim()).optional(),
  category: z
    .enum(["Hardware", "Software", "Netzwerk", "Account", "Email", "Sonstiges"])
    .optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
});

export const solutionUpdateDto = z.object({
  title: optionalString,
  problem: optionalString,
  solution: optionalString,
  keywords: z.array(z.string().trim()).optional(),
  category: z
    .enum(["Hardware", "Software", "Netzwerk", "Account", "Email", "Sonstiges"])
    .optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  isActive: z.boolean().optional(),
});

export const solutionSearchDto = z.object({
  query: requiredString,
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const solutionListDto = z.object({
  category: z.string().optional(),
  priority: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
});

import * as z from 'zod'

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  legalName: z.string().max(100).nullable(),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').nullable().or(z.literal('')),
  jobTitle: z.string().max(100).nullable(),
})

export const accountPreferencesSchema = z.object({
  dashboardDensity: z.enum(['compact', 'comfortable']),
  hiddenBalances: z.boolean(),
  startPage: z.string(),
  currency: z.string().length(3),
  timezone: z.string(),
  locale: z.string(),
  lang: z.enum(['ja', 'vi', 'en']),
})

export const securityPasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const notificationSettingsSchema = z.array(
  z.object({
    category: z.string(),
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
    inApp: z.boolean(),
  })
)

export type ProfileFormValues = z.infer<typeof profileSchema>
export type AccountPreferencesFormValues = z.infer<typeof accountPreferencesSchema>
export type SecurityPasswordFormValues = z.infer<typeof securityPasswordSchema>

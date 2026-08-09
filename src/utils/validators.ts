import { z } from 'zod';

export const stringRequired = z.string().min(1, 'Required');
export const positiveNumber = z.number().positive('Must be positive');

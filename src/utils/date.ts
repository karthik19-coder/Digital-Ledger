import { format, parseISO } from 'date-fns';

export const formatDate = (date: Date | string, formatStr: string = 'PP'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

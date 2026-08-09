export const validateAmount = (amount: number | undefined): void | { success: false, error: { code: string, message: string } } => {
  if (amount === undefined || amount <= 0) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount must be greater than 0' } };
  }
};

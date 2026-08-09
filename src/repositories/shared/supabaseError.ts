export const handleDbError = (error: any): { success: false; error: { code: string; message: string } } => {
  console.error('Database error:', error);
  return { 
    success: false, 
    error: { 
      code: error?.code || 'UNKNOWN_ERROR', 
      message: error?.message || 'An unexpected database error occurred' 
    } 
  };
};

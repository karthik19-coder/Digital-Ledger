export type RepoResult<T> = { 
  success: boolean; 
  data?: T; 
  error?: { code: string; message: string };
};

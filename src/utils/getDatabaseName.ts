export const getDatabaseName = (): string => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;

  if (!supabaseUrl) {
    return 'Unknown Database';
  }

  try {
    const url = new URL(supabaseUrl);
    const subdomain = url.hostname.split('.')[0];
    return `Supabase (${subdomain})`;
  } catch {
    return 'Supabase Database';
  }
};
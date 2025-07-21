// Utility function to determine which database is connected based on the URL
export const getDatabaseName = (): string => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  if (!supabaseUrl) return 'Unknown Database';
  
  if (supabaseUrl.includes('aqzjzjygflmxkcbfnjbe')) {
    return 'Production DB';
  } else if (supabaseUrl.includes('rqcrsrdlcdpkxxkqwvyo')) {
    return 'UAT DB';
  } else {
    return 'Custom DB';
  }
};

export default getDatabaseName;
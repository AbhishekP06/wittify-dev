// Configuration for different environments
export const CONFIG = {
  development: {
    backendUrl: 'http://192.168.1.2:8000', // Local development
  },
  production: {
    backendUrl: 'https://wittify-dev-backend.onrender.com',
  },
  staging: {
    backendUrl: 'https://your-staging-url.render.com', // Replace with your staging URL
  }
};

// Get current environment
const getEnvironment = (): 'development' | 'production' | 'staging' => {
  if (__DEV__) {
    return 'development';
  }
  // You can add logic to detect staging vs production
  return 'production';
};

export const getBackendUrl = (): string => {
  const env = getEnvironment();
  return CONFIG[env].backendUrl;
}; 
const localDevelopmentUrl = import.meta.env?.DEV ? 'http://localhost:3001' : undefined

export const apiBaseUrl = localDevelopmentUrl ?? import.meta.env?.VITE_API_URL


export interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

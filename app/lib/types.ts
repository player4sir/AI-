export interface UserMetadata {
  role?: string;
  credits?: number;
  isUnlimited?: boolean;
  lastUsed?: number;
  createdAt?: number;
}

export interface UserPrivateMetadata {
  usageHistory?: {
    date: number;
    type: string;
    prompt?: string;
  }[];
  paymentHistory?: {
    date: number;
    amount: number;
    status: string;
  }[];
}

export interface UserUnsafeMetadata {
  preferences?: {
    theme?: string;
    language?: string;
  };
} 
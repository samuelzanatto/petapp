export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6; // Minimum password length
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/; // Format: (00) 00000-0000
  return phoneRegex.test(phone);
};

export const validateRequiredField = (value: string): boolean => {
  return value.trim().length > 0; // Check if the field is not empty
};
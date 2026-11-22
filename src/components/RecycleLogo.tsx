import React from 'react';

interface RecycleLogoProps {
  size?: number;
  className?: string;
}

export const RecycleLogo: React.FC<RecycleLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#14532D" />
      <path
        d="M20 8.5C14.8 8.5 10.4 11.9 9 16.6L12.6 17.7C13.6 14.5 16.5 12.2 20 12.2C22.4 12.2 24.6 13.3 26 15L23.5 17.2L31 18.4L30.2 10.9L27.9 13C25.9 10.2 23.1 8.5 20 8.5Z"
        fill="#4ADE80"
      />
      <path
        d="M31 23.4L27.4 22.3C26.4 25.5 23.5 27.8 20 27.8C17.6 27.8 15.4 26.7 14 25L16.5 22.8L9 21.6L9.8 29.1L12.1 27C14.1 29.8 16.9 31.5 20 31.5C25.2 31.5 29.6 28.1 31 23.4Z"
        fill="#BBF7D0"
      />
      <circle cx="20" cy="20" r="3.4" fill="#FFFFFF" />
      <circle cx="20" cy="20" r="1.6" fill="#16A34A" />
    </svg>
  );
};

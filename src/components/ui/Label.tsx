"use client";
import React from "react";

export default function Label({ children, className = "", ...props }: any) {
  return (
    <label className={`block text-sm font-medium text-gray-700 ${className}`} {...props}>
      {children}
    </label>
  );
}

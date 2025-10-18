"use client";
import React from "react";

export default function Button({ children, className = "", ...props }: any) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

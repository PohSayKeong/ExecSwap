"use client";
import React from "react";

export default function Input(props: any) {
  return (
    <input
      {...props}
      className={`w-full p-2 rounded bg-transparent ring-1 ring-gray-100 shadow-sm border border-transparent focus:outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-300 transition-colors ${
        props.className ?? ""
      }`}
    />
  );
}

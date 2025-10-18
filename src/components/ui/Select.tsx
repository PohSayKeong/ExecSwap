"use client";
import React from "react";

export default function Select(props: any) {
  return (
    <select
      {...props}
      className={`w-full p-2 rounded bg-white ring-1 ring-gray-100 shadow-sm border border-transparent focus:outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-300 transition-colors ${
        props.className ?? ""
      }`}
    />
  );
}

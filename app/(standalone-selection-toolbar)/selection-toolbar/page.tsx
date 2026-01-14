"use client";

import { SelectionToolbar } from "@/components/selection-toolbar";

export default function SelectionToolbarPage() {
  return (
    <div className="w-full max-w-[560px] pointer-events-auto">
      {/* 
        Container constrains toolbar width in debug mode (800px window)
        while allowing it to expand naturally in production (560px window)
        pointer-events-auto ensures toolbar is clickable on transparent window
      */}
      <SelectionToolbar />
    </div>
  );
}

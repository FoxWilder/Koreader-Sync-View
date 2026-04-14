import React from "react";
import { LibrarySearch } from "@/components/LibrarySearch";
import { DashboardStats } from "@/components/DashboardStats";

export default function Home() {
  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-background overflow-hidden">
      <div className="w-full md:w-1/3 lg:w-[400px] xl:w-[480px] h-1/2 md:h-full shrink-0 relative z-10 border-b md:border-b-0 md:border-r border-border/50 bg-background/80 backdrop-blur-sm shadow-xl">
        <LibrarySearch />
      </div>
      <div className="w-full md:flex-1 h-1/2 md:h-full overflow-hidden relative">
        <DashboardStats />
      </div>
    </div>
  );
}

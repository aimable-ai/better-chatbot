"use client";
import { useEffect } from "react";
import { SWRConfig } from "swr";

export function SWRConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    console.log(
      "%c\n\n               #########               \n              ###########              \n             #############             \n            ###############            \n           #################           \n          ###       #########          \n         #####       #########         \n        #######       #########        \n       ########        #########       \n      #########         #########      \n     #########           #########     \n    #########             #########    \n   #########               #########   \n\n\n%c⛓️ Aimable Chat Client\nhttps://www.aimable.ai",
      "color: #084be4; font-weight: bold; font-family: monospace; font-size: 12px; text-shadow: 0 0 10px #084be4;",
      "color: #888; font-size: 12px;",
    );
  }, []);
  return (
    <SWRConfig
      value={{
        focusThrottleInterval: 30000,
        dedupingInterval: 2000,
        errorRetryCount: 1,
      }}
    >
      {children}
    </SWRConfig>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { BrandLogo } from "../components/BrandLogo";

interface MainLayoutProps {
  children: React.ReactNode;
  hideBrandLogo?: boolean;
}

export function MainLayout({ children, hideBrandLogo = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col items-center justify-between p-4 selection:bg-zinc-800 relative">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.02)_0%,transparent_100%)] pointer-events-none" />
      
      {/* Global Brand Header Navbar */}
      <header className="w-full max-w-md py-4 flex flex-col items-center justify-center relative z-20 border-b border-zinc-900/60 pb-4 mb-4">
        <div className="flex items-center gap-2.5 h-9">
          {!hideBrandLogo && (
            <BrandLogo className="h-9 w-auto opacity-90 hover:opacity-100 transition duration-200" />
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md relative z-10 flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full py-4"
        >
          {children}
        </motion.div>
      </main>

      {/* Humble aesthetic footer */}
      <footer className="w-full max-w-md py-4 text-center border-t border-zinc-900/40 mt-4 pointer-events-none z-0">
        <p className="font-mono text-[9px] text-zinc-650 tracking-wider uppercase select-none">
          Secuencias Aleatorias Inmutables • NFQ Sorteos
        </p>
      </footer>
    </div>
  );
}

export default MainLayout;

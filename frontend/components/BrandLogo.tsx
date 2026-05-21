/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface BrandLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  style?: React.CSSProperties;
}

export function BrandLogo({ className = "", ...props }: BrandLogoProps) {
  // Safe default sizes prevent screen reflow during loading states
  return (
    <img
      src="https://lh3.googleusercontent.com/d/1ZRUArlFz7uZOmsEB8cVRBjTHcEZQejNQ"
      alt="Nfq Logo"
      referrerPolicy="no-referrer"
      className={`h-10 w-auto object-contain select-none pointer-events-none ${className}`}
      style={{ minHeight: "40px" }} // Restricts vertical layout shift
      {...props}
    />
  );
}

export default BrandLogo;
